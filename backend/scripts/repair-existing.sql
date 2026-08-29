ALTER TABLE places
  DROP CONSTRAINT IF EXISTS places_created_by_fkey,
  ADD CONSTRAINT places_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE place_photos
  DROP CONSTRAINT IF EXISTS place_photos_uploaded_by_fkey,
  ADD CONSTRAINT place_photos_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;

INSERT INTO list_members (list_id, user_id, role)
SELECT id, owner_id, 'creator' FROM lists
ON CONFLICT (list_id, user_id) DO NOTHING;
