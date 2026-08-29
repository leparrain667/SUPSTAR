import { useEffect, useState } from 'react';
import api from '../api/client';
import { getApiError } from '../utils/errors';
import UserAvatar from './UserAvatar';

function Stars({ value = 0, interactive = false, onChange }) {
  return (
    <div className="supstar-stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`supstar-star ${
            star <= value ? 'active' : ''
          } ${interactive ? 'interactive' : ''}`}
          onClick={() => {
            if (interactive && onChange) {
              onChange(star);
            }
          }}
          disabled={!interactive}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function formatDate(date) {
  if (!date) return '';

  return new Date(date).toLocaleDateString(
    'fr-FR',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }
  );
}

export default function ReviewsSection({
  placeId,
  currentUser,
  currentRole,
  onChanged,
}) {
  const [reviews, setReviews] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const [editingId, setEditingId] = useState(null);

  const [error, setError] = useState('');

  async function loadReviews() {
    try {
      setLoading(true);
      setError('');

      const { data } = await api.get(
        `/places/${placeId}/reviews`
      );

      setReviews(data.reviews || []);
    } catch (err) {
      setError(getApiError(err, 'Impossible de charger les avis.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (placeId) {
      loadReviews();
    }
  }, [placeId]);

  const ownReview = reviews.find(
    (review) =>
      review.userId === currentUser?.id ||
      review.user?.id === currentUser?.id
  );

  function resetForm() {
    setRating(0);
    setComment('');
    setEditingId(null);
  }

  function editReview(review) {
    setEditingId(review.id);
    setRating(Number(review.rating));
    setComment(review.comment || '');
    setError('');
  }

  async function submitReview(event) {
    event.preventDefault();

    if (rating < 1 || rating > 5) {
      setError(
        'Veuillez sélectionner une note entre 1 et 5.'
      );
      return;
    }

    try {
      setSaving(true);
      setError('');

      if (editingId) {
        await api.put(
          `/places/${placeId}/reviews/${editingId}`,
          {
            rating,
            comment,
          }
        );
      } else {
        await api.post(
          `/places/${placeId}/reviews`,
          {
            rating,
            comment,
          }
        );
      }

      resetForm();
      await loadReviews();
      await onChanged?.();
    } catch (err) {
      setError(getApiError(err, 'Impossible d’enregistrer votre avis.'));
    } finally {
      setSaving(false);
    }
  }

  async function deleteReview(reviewId) {
    if (
      !window.confirm(
        'Voulez-vous vraiment supprimer cet avis ?'
      )
    ) {
      return;
    }

    try {
      setError('');

      await api.delete(
        `/places/${placeId}/reviews/${reviewId}`
      );

      await loadReviews();
      await onChanged?.();
    } catch (err) {
      setError(getApiError(err, 'Impossible de supprimer cet avis.'));
    }
  }

  const average =
    reviews.length > 0
      ? reviews.reduce(
          (sum, review) =>
            sum + Number(review.rating || 0),
          0
        ) / reviews.length
      : 0;
  const canReview = ['creator', 'editor', 'commentator'].includes(currentRole);
  const canModerate = ['creator', 'editor'].includes(currentRole);

  return (
    <section className="supstar-reviews">
      {/* HEADER */}
      <div className="supstar-reviews-header">
        <div>
          <h2>Avis et notes</h2>

          <p>
            {reviews.length === 0
              ? 'Aucun avis pour le moment'
              : `${reviews.length} ${
                  reviews.length === 1
                    ? 'avis'
                    : 'avis'
                }`}
          </p>
        </div>

        <div className="supstar-rating-summary">
          <strong>
            {average.toFixed(1)}
          </strong>

          <Stars
            value={Math.round(average)}
          />
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="supstar-review-error">
          {error}
        </div>
      )}

      {/* ADD / EDIT REVIEW */}
      {canReview && (!ownReview || editingId) ? (
        <form
          className="supstar-review-form"
          onSubmit={submitReview}
        >
          <h3>
            {editingId
              ? 'Modifier cet avis'
              : 'Donner votre avis'}
          </h3>

          <div className="supstar-review-rating">
            <span>Votre note :</span>

            <Stars
              value={rating}
              interactive
              onChange={setRating}
            />
          </div>

          <textarea
            value={comment}
            onChange={(event) =>
              setComment(event.target.value)
            }
            rows={4}
            maxLength={2000}
            placeholder="Partagez votre expérience..."
          />

          <div className="supstar-review-form-footer">
            <span>
              {comment.length}/2000
            </span>

            <div className="flex gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="supstar-review-cancel"
                >
                  Annuler
                </button>
              )}

              <button
                type="submit"
                disabled={saving}
                className="supstar-review-submit"
              >
                {saving
                  ? 'Enregistrement...'
                  : editingId
                    ? 'Modifier'
                    : 'Publier mon avis'}
              </button>
            </div>
          </div>
        </form>
      ) : null}

      {/* REVIEWS */}
      {loading ? (
        <div className="supstar-review-loading">
          Chargement des avis...
        </div>
      ) : reviews.length === 0 ? (
        <div className="supstar-no-reviews">
          Soyez le premier à donner votre avis
          sur ce lieu.
        </div>
      ) : (
        <div className="supstar-review-list">
          {reviews.map((review) => {
            const isMine =
              review.userId === currentUser?.id ||
              review.user?.id === currentUser?.id;

            return (
              <article
                key={review.id}
                className="supstar-review-card"
              >
                <div className="supstar-review-top">
                  <div className="supstar-review-author">
                    <UserAvatar user={review.user} size="small" />
                    <div>
                      <strong>
                        {review.user?.displayName ||
                          review.user?.name ||
                          review.user?.email ||
                          'Utilisateur'}
                      </strong>

                      <div className="supstar-review-date">
                        {formatDate(
                          review.updatedAt ||
                            review.createdAt
                        )}
                      </div>
                    </div>
                  </div>

                  <Stars
                    value={Number(
                      review.rating
                    )}
                  />
                </div>

                {review.comment && (
                  <p className="supstar-review-comment">
                    {review.comment}
                  </p>
                )}

                {(isMine || canModerate) && (
                  <div className="supstar-review-actions">
                    <button
                      type="button"
                      onClick={() =>
                        editReview(review)
                      }
                    >
                      Modifier
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteReview(
                          review.id
                        )
                      }
                    >
                      Supprimer
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
