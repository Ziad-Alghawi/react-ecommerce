import axios from 'axios';
import { useState } from 'react';
import { ButtonSpinner } from '../../components/PageStatus';
import { RatingStars } from '../../components/Rating';
import { useAction } from '../../hooks/useAction';
import { formatDate } from '../../utils/date';
import type { Review } from '../../types/store';

interface ReviewItemProps {
  review: Review;
  canDelete: boolean;
  onEdit: () => void;
  onDeleted: () => Promise<void>;
}

export function ReviewItem({ review, canDelete, onEdit, onDeleted }: ReviewItemProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const [deleteReview, isDeleting] = useAction(async () => {
    await axios.delete(`/api/products/${review.productId}/reviews/${review.id}`);
    await onDeleted();
  });

  return (
    <li className="review" data-testid="review">
      <div className="review-header">
        <RatingStars stars={review.stars} />
        <span className="review-verified">Verified purchase</span>
      </div>
      <div className="review-meta">
        {review.authorName}{review.isMine && ' (you)'} · {formatDate(review.createdAt)}
      </div>
      {review.text && <p className="review-text">{review.text}</p>}

      {/* The keys swap in new buttons, so a double click on Delete can't also confirm it */}
      {isConfirmingDelete ? (
        <div key="confirm" className="review-actions" role="group" aria-label="Delete this review?">
          <span className="review-confirm-text">Delete this review?</span>
          <button className="button-danger" type="button" disabled={isDeleting} onClick={deleteReview}
            data-testid="review-confirm-delete-button">
            {isDeleting && <ButtonSpinner />}
            Delete
          </button>
          <button className="button-secondary" type="button" disabled={isDeleting} autoFocus
            onClick={() => setIsConfirmingDelete(false)}>
            Keep
          </button>
        </div>
      ) : (review.isMine || canDelete) && (
        <div key="actions" className="review-actions">
          {review.isMine && (
            <button className="button-secondary" type="button" onClick={onEdit}
              data-testid="review-edit-button">
              Edit
            </button>
          )}
          <button className="button-secondary" type="button" onClick={() => setIsConfirmingDelete(true)}
            data-testid="review-delete-button">
            Delete
          </button>
        </div>
      )}
    </li>
  );
}
