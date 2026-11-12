import type { Rating } from '../types/store';
import './Rating.css';

interface RatingStarsProps {
  stars: number;
}

// There's an image for every half star, which is how the API rounds ratings
export function RatingStars({ stars }: RatingStarsProps) {
  return (
    <img className="rating-stars" src={`images/ratings/rating-${stars * 10}.png`}
      alt={`${stars} out of 5 stars`} width="96" height="19" />
  );
}

interface ProductRatingProps {
  rating: Rating;
}

export function ProductRating({ rating }: ProductRatingProps) {
  return (
    <div className="product-rating-container">
      <RatingStars stars={rating.stars} />
      <span className="product-rating-count">
        {rating.count}
      </span>
    </div>
  );
}
