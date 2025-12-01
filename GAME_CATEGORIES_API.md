# Game Categories API Documentation

This document describes the API endpoints for managing game categories: Featured, Premium, Exclusive, and Tournament games.

## Base URL

All endpoints are prefixed with `/api/games`

## Category Fields

Each game now supports the following boolean fields:

- `featured`: Whether the game is featured
- `premium`: Whether the game is premium content
- `exclusive`: Whether the game is exclusive
- `tournament`: Whether the game is available for tournaments

## Endpoints

### 1. Get Games by Category

#### Get Featured Games

```
GET /api/games/categories/featured
```

Returns all games where `featured = true`

#### Get Premium Games

```
GET /api/games/categories/premium
```

Returns all games where `premium = true`

#### Get Exclusive Games

```
GET /api/games/categories/exclusive
```

Returns all games where `exclusive = true`

#### Get Tournament Games

```
GET /api/games/categories/tournament
```

Returns all games where `tournament = true`

#### Get Games by Multiple Categories

```
GET /api/games/categories/filter?featured=true&premium=true&exclusive=false&tournament=true
```

Returns games that match multiple category criteria.

**Query Parameters:**

- `featured`: `true` | `false` (optional)
- `premium`: `true` | `false` (optional)
- `exclusive`: `true` | `false` (optional)
- `tournament`: `true` | `false` (optional)

### 2. Toggle Category Status

#### Toggle Featured Status

```
PATCH /api/games/:id/toggle-featured
```

Toggles the featured status of a game.

#### Toggle Premium Status

```
PATCH /api/games/:id/toggle-premium
```

Toggles the premium status of a game.

#### Toggle Exclusive Status

```
PATCH /api/games/:id/toggle-exclusive
```

Toggles the exclusive status of a game.

#### Toggle Tournament Status

```
PATCH /api/games/:id/toggle-tournament
```

Toggles the tournament status of a game.

**Response Format for Toggle Endpoints:**

```json
{
  "message": "Game added to featured", // or "removed from featured"
  "game": {
    "id": "game_id",
    "title": "Game Title",
    "featured": true,
    "premium": false,
    "exclusive": false,
    "tournament": false
    // ... other game fields
  }
}
```

### 3. Bulk Operations

#### Bulk Update Game Categories

```
PATCH /api/games/bulk/categories
```

Updates multiple games at once for a specific category.

**Request Body:**

```json
{
  "gameIds": ["game_id_1", "game_id_2", "game_id_3"],
  "categoryType": "featured", // "featured" | "premium" | "exclusive" | "tournament"
  "status": true // true to add to category, false to remove
}
```

**Response:**

```json
{
  "message": "3 games updated successfully",
  "updatedGames": [
    {
      "id": "game_id_1",
      "title": "Game 1",
      "featured": true
      // ... other fields
    }
    // ... other updated games
  ]
}
```

### 4. Updated Game Creation

When creating a new game, you can now include the category fields:

```
POST /api/games
```

**Request Body (form-data or JSON):**

```json
{
  "title": "New Game",
  "description": "Game description",
  "featured": false,
  "premium": true,
  "exclusive": false,
  "tournament": true
  // ... other game fields
}
```

### 5. Updated Game Update

When updating a game, you can modify the category fields:

```
PUT /api/games/:id
```

**Request Body:**

```json
{
  "title": "Updated Game Title",
  "featured": true,
  "premium": false,
  "exclusive": true,
  "tournament": false
  // ... other fields to update
}
```

## Response Formats

### Success Response

```json
{
  "id": "game_id",
  "title": "Game Title",
  "description": "Game description",
  "featured": true,
  "premium": false,
  "exclusive": true,
  "tournament": false,
  "createdAt": "2025-09-01T10:00:00Z",
  "updatedAt": "2025-09-01T10:00:00Z"
  // ... other game fields
}
```

### Error Response

```json
{
  "error": "Error message description"
}
```

## Usage Examples

### Frontend Integration

```javascript
// Get featured games
const featuredGames = await api.get("/api/games/categories/featured");

// Toggle premium status
const updatedGame = await api.patch(`/api/games/${gameId}/toggle-premium`);

// Bulk update multiple games to tournament
const result = await api.patch("/api/games/bulk/categories", {
  gameIds: ["game1", "game2", "game3"],
  categoryType: "tournament",
  status: true,
});

// Get games that are both featured and premium
const specialGames = await api.get(
  "/api/games/categories/filter?featured=true&premium=true"
);
```

## Database Schema

Each game document now includes these additional fields:

```javascript
{
  // ... existing fields
  featured: Boolean, // default: false
  premium: Boolean,  // default: false
  exclusive: Boolean, // default: false
  tournament: Boolean, // default: false
  updatedAt: Date    // updated on any category change
}
```
