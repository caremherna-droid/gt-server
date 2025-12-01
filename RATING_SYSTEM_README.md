# Game Rating System Implementation

This document describes the implementation of the game rating system for the GameTribe platform.

## Overview

The rating system allows authenticated users to rate games on a scale of 1-5 stars. It includes:
- Individual user ratings
- Aggregate rating statistics
- Real-time rating updates
- Rating history and management

## Database Structure

### Ratings Collection (`ratings`)
```javascript
{
  id: "auto-generated-id",
  gameId: "game-document-id",
  userId: "firebase-user-uid",
  userName: "User Display Name",
  userEmail: "user@example.com",
  userAvatar: "https://avatar-url.com/image.jpg",
  rating: 4.5, // Number between 1-5
  createdAt: "2025-01-16T20:00:00.000Z",
  updatedAt: "2025-01-16T20:00:00.000Z"
}
```

### Games Collection Updates
The games collection is automatically updated with:
```javascript
{
  rating: 4.2, // Average rating (1 decimal place)
  ratingCount: 15, // Total number of ratings
  // ... other game fields
}
```

## API Endpoints

### Public Endpoints (No Authentication Required)

#### GET `/api/ratings/game/:gameId`
Get all ratings for a specific game.
- **Response**: Array of rating objects
- **Status**: 200 OK

#### GET `/api/ratings/game/:gameId/stats`
Get rating statistics for a specific game.
- **Response**: 
```javascript
{
  success: true,
  data: {
    average: 4.2,
    total: 15,
    breakdown: {
      5: 8,
      4: 4,
      3: 2,
      2: 1,
      1: 0
    }
  }
}
```

### Protected Endpoints (Authentication Required)

#### POST `/api/ratings`
Submit a new rating for a game.
- **Headers**: `Authorization: Bearer <firebase-token>`
- **Body**:
```javascript
{
  gameId: "game-id",
  rating: 4.5
}
```
- **Response**: Created rating object
- **Status**: 201 Created
- **Validation**: 
  - Rating must be between 1-5
  - User cannot rate the same game twice
  - User must be authenticated

#### GET `/api/ratings/game/:gameId/user/:userId`
Get a specific user's rating for a game.
- **Headers**: `Authorization: Bearer <firebase-token>`
- **Response**: Rating object or 404 if not found
- **Security**: Users can only access their own ratings

#### PUT `/api/ratings/:ratingId`
Update an existing rating.
- **Headers**: `Authorization: Bearer <firebase-token>`
- **Body**:
```javascript
{
  rating: 3.5
}
```
- **Response**: Updated rating object
- **Security**: Users can only update their own ratings

#### DELETE `/api/ratings/:ratingId`
Delete a rating.
- **Headers**: `Authorization: Bearer <firebase-token>`
- **Response**: Success message
- **Security**: Users can only delete their own ratings

#### GET `/api/ratings/user/:userId`
Get all ratings by a specific user.
- **Headers**: `Authorization: Bearer <firebase-token>`
- **Response**: Array of rating objects

## Frontend Integration

### API Service Methods
The following methods have been added to `gt-client/src/services/api.js`:

```javascript
// Get all ratings for a game
getGameRatings(gameId)

// Get user's rating for a specific game
getUserRating(gameId, userId, token)

// Submit a new rating
submitRating(ratingData, token)

// Update existing rating
updateRating(ratingId, ratingData, token)

// Delete a rating
deleteRating(ratingId, gameId, token)
```

### Components

#### InteractiveStarRating
- Interactive star rating component
- Hover effects and click handling
- Supports different sizes
- Disabled state for loading

#### Rating Section in GamePage
- Overall rating display with average and total count
- Rating breakdown with visual bars
- User rating form for authenticated users
- Recent ratings list with user info
- Real-time updates after rating submission

## Features

### User Experience
- **Visual Feedback**: Hover effects and animations
- **Real-time Updates**: Ratings update immediately after submission
- **Authentication Integration**: Seamless login requirements
- **Responsive Design**: Works on all screen sizes
- **Error Handling**: Comprehensive error messages and loading states

### Security
- **Authentication Required**: All write operations require valid Firebase tokens
- **User Ownership**: Users can only modify their own ratings
- **Input Validation**: Rating values validated on both client and server
- **Rate Limiting**: Prevents duplicate ratings from same user

### Performance
- **Caching**: API responses are cached for better performance
- **Optimistic Updates**: UI updates immediately while API calls process
- **Efficient Queries**: Firestore queries optimized for performance
- **Automatic Aggregation**: Game ratings automatically calculated and cached

## Testing

### Backend Testing
Run the test script to verify endpoints:
```bash
cd gt-server
node test-rating-endpoints.js
```

### Manual Testing Checklist
- [ ] Submit rating as authenticated user
- [ ] Update existing rating
- [ ] View rating breakdown and statistics
- [ ] Delete rating
- [ ] Verify authentication requirements
- [ ] Test rating validation (1-5 range)
- [ ] Check duplicate rating prevention

## Error Handling

### Common Error Responses
- `401 Unauthorized`: Missing or invalid authentication token
- `400 Bad Request`: Invalid rating value or missing required fields
- `403 Forbidden`: Attempting to modify another user's rating
- `404 Not Found`: Rating or game not found
- `500 Internal Server Error`: Server-side errors

### Client-Side Error Handling
- Toast notifications for user feedback
- Loading states during API calls
- Graceful fallbacks for missing data
- Retry mechanisms for failed requests

## Deployment Notes

### Environment Variables
Ensure the following Firebase configuration is set:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`
- Other Firebase service account variables

### Database Indexes
Create the following Firestore indexes for optimal performance:
- `ratings` collection: `gameId` (ascending), `createdAt` (descending)
- `ratings` collection: `userId` (ascending), `createdAt` (descending)
- `ratings` collection: `gameId` (ascending), `userId` (ascending)

### Security Rules
Update Firestore security rules to allow:
- Read access to ratings for all users
- Write access to ratings only for authenticated users
- Users can only modify their own ratings

## Future Enhancements

### Potential Features
- Rating comments/reviews
- Rating moderation system
- Rating analytics and insights
- Bulk rating operations
- Rating export functionality
- Advanced filtering and sorting
- Rating notifications
- Rating badges and achievements

### Performance Optimizations
- Implement rating aggregation using Cloud Functions
- Add rating caching with Redis
- Implement rating pagination for large datasets
- Add rating search functionality
