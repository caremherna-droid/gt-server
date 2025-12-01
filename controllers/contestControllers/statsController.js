import { db } from "../../config/firebase.js"; 


export const getStats = async (req, res) => {
  try {
    // example: count documents in each collection
    const [contestsSnap, usersSnap, submissionsSnap] = await Promise.all([
      db.collection("contests").get(),
      db.collection("users").get(),
      db.collection("submissions").get(),
    ]);
    const totalContests = contestsSnap.size;
    const activeUsers = usersSnap.size;
    const submissions = submissionsSnap.size;
    
    // Calculate prize pool (sum of all contest prizes)
    let prizePool = 0;
    contestsSnap.forEach(doc => {
      const contest = doc.data();
      if (contest.prize) {
        try {
          if (typeof contest.prize === 'number') {
            // If prize is a number, add it directly
            prizePool += contest.prize;
          } else if (typeof contest.prize === 'string') {
            // Try to parse string as number (remove any non-numeric chars except decimal point)
            const numericValue = parseFloat(contest.prize.replace(/[^0-9.]/g, ''));
            if (!isNaN(numericValue)) {
              prizePool += numericValue;
            }
          } else if (contest.prize.total) {
            // If prize has a total property
            const total = typeof contest.prize.total === 'number' 
              ? contest.prize.total 
              : parseFloat(contest.prize.total.replace(/[^0-9.]/g, ''));
              
            if (!isNaN(total)) {
              prizePool += total;
            }
          } else if (contest.prize.firstPlace) {
            // If prize has individual place values
            let sum = 0;
            
            // Parse firstPlace
            const firstPlace = typeof contest.prize.firstPlace === 'number'
              ? contest.prize.firstPlace
              : parseFloat(contest.prize.firstPlace.toString().replace(/[^0-9.]/g, ''));
            
            if (!isNaN(firstPlace)) {
              sum += firstPlace;
            }
            
            // Parse secondPlace if it exists
            if (contest.prize.secondPlace) {
              const secondPlace = typeof contest.prize.secondPlace === 'number'
                ? contest.prize.secondPlace
                : parseFloat(contest.prize.secondPlace.toString().replace(/[^0-9.]/g, ''));
              
              if (!isNaN(secondPlace)) {
                sum += secondPlace;
              }
            }
            
            // Parse thirdPlace if it exists
            if (contest.prize.thirdPlace) {
              const thirdPlace = typeof contest.prize.thirdPlace === 'number'
                ? contest.prize.thirdPlace
                : parseFloat(contest.prize.thirdPlace.toString().replace(/[^0-9.]/g, ''));
              
              if (!isNaN(thirdPlace)) {
                sum += thirdPlace;
              }
            }
            
            prizePool += sum;
          }
        } catch (err) {
          console.error("Error calculating prize for contest:", doc.id, err);
        }
      }
    });

    // Round prize pool to the nearest whole number
    prizePool = Math.round(prizePool);

    res.json({
      success: true,
      data: {
        totalContests,
        activeUsers,
        submissions,
        prizePool,
        contestsTrend: "0%",
        usersTrend: "0%",
        submissionsTrend: "0%",
        prizePoolTrend: "0%",
        contestsTrendUp: true,
        usersTrendUp: true,
        submissionsTrendUp: true,
        prizePoolTrendUp: true,
      },
    });
  } catch (err) {
    console.error("Error loading stats:", err);
    res.status(500).json({
      success: false,
      message: "Error loading stats",
      error: err.message,
    });
  }
};
