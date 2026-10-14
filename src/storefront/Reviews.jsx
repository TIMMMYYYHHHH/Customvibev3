import React from 'react';
import {BrandDoodle} from './ReferenceThread';

// Supply published, attributed Google reviews here when the Business Profile
// connection is configured. Until then, never display invented ratings or quotes.
export default function Reviews({reviews=[],profileUrl=null}) {
  return <section className="reviews content" id="reviews" aria-labelledby="reviews-title">
    <div className="reviews-intro"><p className="overline">WORDS FROM OUR TRIBE</p><h2 id="reviews-title">Good words.<br/>Happy fridges.</h2><p>Little squares. Real people.<br/>Their stories belong here, too.</p><BrandDoodle kind="heart" className="reviews-heart berry"/></div>
    <div className="reviews-content">
      <div className="reviews-source"><span>Google reviews</span>{profileUrl&&<a href={profileUrl} target="_blank" rel="noreferrer">Read reviews on Google</a>}</div>
      {reviews.length ? <div className="review-list">{reviews.map(review=><article className="review" key={review.id}><p className="review-rating" aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}<span aria-hidden="true">{'☆'.repeat(5-review.rating)}</span></p><blockquote>{review.text}</blockquote><p className="review-author">{review.author}</p><a href={review.url} target="_blank" rel="noreferrer">Read on Google</a></article>)}</div> : <div className="reviews-empty"><span className="review-scribble">From your fridge,<br/>with love.</span><h3>A little space for your stories.</h3><p>Your favourite people. Your favourite moments. We’d love to hear your story.</p><span className="reviews-pending">Google reviews coming soon</span><BrandDoodle className="reviews-rays mint"/></div>}
    </div>
  </section>;
}
