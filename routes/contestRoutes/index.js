import contestsRouter from "./contests.js";
import winnersRouter from "./winners.js";
import submissionsRouter from "./submissions.js";
import usersRouter from "./users.js";
import activityRouter from "./activity.js";
import settingsRouter from "./settings.js";
import statsRouter from "./stats.js";
import categoriesRouter from "./categories.js";

export default {
  contests: contestsRouter,
  winners: winnersRouter,
  submissions: submissionsRouter,
  users: usersRouter,
  activity: activityRouter,
  settings: settingsRouter,
  stats: statsRouter,
  categories: categoriesRouter
};