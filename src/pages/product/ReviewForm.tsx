import axios from 'axios';
import { useState, type FormEvent } from 'react';
import { ButtonSpinner } from '../../components/PageStatus';
import { useAction } from '../../hooks/useAction';
import { useToast } from '../../hooks/useToast';
import type { Review } from '../../types/store';

const STAR_CHOICES = [1, 2, 3, 4, 5];
const MAX_TEXT_LENGTH = 500;

interface ReviewFormProps {
  productId: string;
  // Null when writing a new review
  review: Review | null;
  onSaved: () => Promise<void>;
  onCancel?: () => void;
}

export function ReviewForm({ productId, review, onSaved, onCancel }: ReviewFormProps) {
  const [stars, setStars] = useState(review?.stars ?? 0);
  const [text, setText] = useState(review?.text ?? '');
  const showToast = useToast();

  const [save, isSaving] = useAction(async () => {
    const fields = { stars, text };
    if (review) {
      await axios.put(`/api/products/${productId}/reviews/${review.id}`, fields);
    } else {
      await axios.post(`/api/products/${productId}/reviews`, fields);
    }
    await onSaved();
    showToast(review ? 'Review updated' : 'Thanks! Your review is posted');
  });

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save();
  };

  const title = review ? 'Edit your review' : 'Write a review';

  return (
    <form className="review-form" onSubmit={submitForm} aria-label={title} data-testid="review-form">
      <h3 className="review-form-title">{title}</h3>

      <fieldset className="review-stars-field">
        <legend>Rating</legend>
        <div className="review-stars-picker">
          {STAR_CHOICES.map((choice) => (
            <label key={choice} className={`review-star-option${choice <= stars ? ' is-filled' : ''}`}>
              <input className="visually-hidden" type="radio" name="stars" required value={choice}
                checked={stars === choice} onChange={() => setStars(choice)}
                aria-label={`${choice} ${choice === 1 ? 'star' : 'stars'}`} />
              <span aria-hidden="true">★</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="form-field">
        Review (optional)
        <textarea rows={4} maxLength={MAX_TEXT_LENGTH} value={text} aria-describedby="review-text-hint"
          onChange={(event) => setText(event.target.value)}
          data-testid="review-text-input" />
        <span id="review-text-hint" className="review-hint">
          {text.length}/{MAX_TEXT_LENGTH} characters
        </span>
      </label>

      <div className="review-form-actions">
        <button className="button-primary" type="submit" disabled={isSaving}
          data-testid="review-save-button">
          {isSaving && <ButtonSpinner />}
          {review ? 'Save changes' : 'Post review'}
        </button>
        {onCancel && (
          <button className="button-secondary" type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
