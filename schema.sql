-- ============================================================
-- SUPSTAR — Schéma de base de données PostgreSQL + PostGIS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- 1. UTILISATEURS
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255),              -- NULL si uniquement OAuth2
    display_name    VARCHAR(100) NOT NULL,
    avatar_url      VARCHAR(500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE oauth_accounts (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider           VARCHAR(30) NOT NULL CHECK (provider IN ('google','apple','microsoft','github')),
    provider_user_id   VARCHAR(255) NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_user_id)
);

CREATE TABLE travel_preferences (
    user_id                 UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    preferred_categories    TEXT[] DEFAULT '{}',
    budget_range            VARCHAR(20),          -- ex: '€', '€€', '€€€'
    preferred_languages     TEXT[] DEFAULT '{}',
    notification_settings   JSONB DEFAULT '{}'::jsonb,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. LISTES (personnelles ou partagées)
-- ============================================================

CREATE TABLE lists (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name          VARCHAR(150) NOT NULL,
    description   TEXT,
    is_personal   BOOLEAN NOT NULL DEFAULT false,   -- true = collection perso auto-créée
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE list_members (
    list_id     UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL CHECK (role IN ('creator','editor','reader','commentator')),
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (list_id, user_id)
);

-- ============================================================
-- 3. LIEUX
-- ============================================================

CREATE TABLE categories (
    id    SERIAL PRIMARY KEY,
    name  VARCHAR(50) NOT NULL UNIQUE   -- restaurant, hôtel, bar, musée, activité, voyage...
);

CREATE TABLE places (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id         UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    category_id     INT REFERENCES categories(id),
    name            VARCHAR(200) NOT NULL,
    address         VARCHAR(300),
    city            VARCHAR(100),
    country         VARCHAR(100),
    description     TEXT,
    opening_hours   JSONB,              -- ex: {"mon":"9h-18h", ...}, optionnel
    price_min       NUMERIC(10,2),
    price_max       NUMERIC(10,2),
    location        GEOGRAPHY(Point, 4326) NOT NULL,   -- lat/lon
    avg_rating      NUMERIC(3,2) NOT NULL DEFAULT 0,   -- mis à jour par trigger
    review_count    INT NOT NULL DEFAULT 0,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    search_vector   TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('french', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('french', coalesce(city, '')), 'B') ||
        setweight(to_tsvector('french', coalesce(description, '')), 'C')
    ) STORED
);

-- Index géospatial (GiST) : requêtes "lieux à proximité" en O(log n)
CREATE INDEX idx_places_location ON places USING GIST (location);

-- Index recherche plein texte
CREATE INDEX idx_places_search ON places USING GIN (search_vector);

-- Index filtrage classique
CREATE INDEX idx_places_city ON places (city);
CREATE INDEX idx_places_category ON places (category_id);
CREATE INDEX idx_places_list ON places (list_id);
CREATE INDEX idx_places_price ON places (price_min, price_max);

CREATE TABLE place_photos (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    place_id     UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    url          VARCHAR(500) NOT NULL,
    uploaded_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tags (
    id    SERIAL PRIMARY KEY,
    name  VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE place_tags (
    place_id  UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    tag_id    INT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (place_id, tag_id)
);

-- Statut individuel (visité / à visiter / favori) — un par (user, place)
CREATE TABLE user_place_status (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    place_id    UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL CHECK (status IN ('to_visit','visited','favorite')),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, place_id)
);

CREATE INDEX idx_user_place_status_status ON user_place_status (status);

-- ============================================================
-- 4. AVIS / NOTES
-- ============================================================

CREATE TABLE reviews (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    place_id    UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (place_id, user_id)   -- un seul avis par utilisateur et par lieu
);

CREATE INDEX idx_reviews_place ON reviews (place_id);

-- ============================================================
-- 6. NOTIFICATIONS IN-APP
-- ============================================================

CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(40) NOT NULL DEFAULT 'general',
    title       VARCHAR(160) NOT NULL,
    message     VARCHAR(500) NOT NULL,
    data        JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON notifications (user_id, read_at, created_at DESC);

-- Trigger : recalcule avg_rating et review_count sur places à chaque changement
CREATE OR REPLACE FUNCTION fn_update_place_rating() RETURNS TRIGGER AS $$
DECLARE
    target_place_id UUID := COALESCE(NEW.place_id, OLD.place_id);
BEGIN
    UPDATE places
    SET avg_rating   = COALESCE((SELECT ROUND(AVG(rating), 2) FROM reviews WHERE place_id = target_place_id), 0),
        review_count = (SELECT COUNT(*) FROM reviews WHERE place_id = target_place_id)
    WHERE id = target_place_id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reviews_after_change
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION fn_update_place_rating();

-- ============================================================
-- 5. DONNÉES DE RÉFÉRENCE (seed minimal)
-- ============================================================

INSERT INTO categories (name) VALUES
    ('Restaurant'), ('Hôtel'), ('Bar'), ('Musée'), ('Activité'), ('Voyage')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Exemple de requête géo optimisée (lieux dans un rayon de 5 km)
-- ============================================================
-- SELECT id, name, ST_Distance(location, ST_MakePoint(:lon, :lat)::geography) AS distance_m
-- FROM places
-- WHERE ST_DWithin(location, ST_MakePoint(:lon, :lat)::geography, 5000)
-- ORDER BY distance_m ASC;
