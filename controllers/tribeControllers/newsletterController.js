import { db } from "../../config/firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { sendWelcomeEmail } from "../../services/emailService.js";

const newsletterCollection = db.collection("newsletter_subscriptions");

export const subscribeToNewsletter = async (req, res) => {
  try {
    console.log("Subscribe request received:", req.body);

    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: "Please enter a valid email address",
      });
    }

    // Check if email already exists
    const existingSubscription = await newsletterCollection
      .where("email", "==", email.toLowerCase())
      .get();

    if (!existingSubscription.empty) {
      // Check if they're already active
      const existingDoc = existingSubscription.docs[0];
      const existingData = existingDoc.data();

      if (existingData.status === "active") {
        return res.status(409).json({
          success: false,
          error: "You're already subscribed to our newsletter",
        });
      } else {
        // Reactivate subscription
        await newsletterCollection.doc(existingDoc.id).update({
          status: "active",
          resubscribedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        return res.status(200).json({
          success: true,
          message: "Welcome back! Your subscription has been reactivated.",
        });
      }
    }

    // Create new subscription
    const subscriptionData = {
      email: email.toLowerCase(),
      status: "active",
      source: "footer_form",
      confirmedAt: new Date().toISOString(),
      subscribedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await newsletterCollection.add(subscriptionData);

    // Send welcome email
    try {
      await sendWelcomeEmail(email.toLowerCase(), subscriptionData.name);
      console.log(`Welcome email sent to ${email}`);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Don't fail the subscription if email fails
    }

    res.status(201).json({
      success: true,
      message:
        "Successfully subscribed! You'll receive the latest updates from GameTribe.",
    });
  } catch (error) {
    console.error("Error subscribing to newsletter:", error);
    res.status(500).json({
      success: false,
      error: "Failed to subscribe to newsletter. Please try again.",
      details: error.message,
    });
  }
};

export const unsubscribeFromNewsletter = async (req, res) => {
  try {
    console.log("Unsubscribe request received:", req.body);

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    const subscription = await newsletterCollection
      .where("email", "==", email.toLowerCase())
      .get();

    if (subscription.empty) {
      return res.status(404).json({
        success: false,
        error: "Email not found in our subscription list",
      });
    }

    const subscriptionDoc = subscription.docs[0];
    await newsletterCollection.doc(subscriptionDoc.id).update({
      status: "unsubscribed",
      unsubscribedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    res.status(200).json({
      success: true,
      message: "Successfully unsubscribed from newsletter",
    });
  } catch (error) {
    console.error("Error unsubscribing from newsletter:", error);
    res.status(500).json({
      success: false,
      error: "Failed to unsubscribe. Please try again.",
      details: error.message,
    });
  }
};

export const getNewsletterSubscriptions = async (req, res) => {
  try {
    const { status = "all", page = 1, limit = 50 } = req.query;

    let querySnapshot;
    let totalSnapshot;

    if (status === "all") {
      // Get all subscriptions without status filter
      querySnapshot = await newsletterCollection.limit(parseInt(limit)).get();

      totalSnapshot = await newsletterCollection.get();
    } else {
      // Get subscriptions filtered by status
      querySnapshot = await newsletterCollection
        .where("status", "==", status)
        .limit(parseInt(limit))
        .get();

      totalSnapshot = await newsletterCollection
        .where("status", "==", status)
        .get();
    }

    const subscriptions = [];
    querySnapshot.forEach((doc) => {
      subscriptions.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Sort subscriptions by subscribedAt in memory (descending order)
    subscriptions.sort((a, b) => {
      const dateA = new Date(a.subscribedAt || 0);
      const dateB = new Date(b.subscribedAt || 0);
      return dateB - dateA; // Descending order
    });

    const total = totalSnapshot.size;

    res.status(200).json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching newsletter subscriptions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch subscriptions",
      details: error.message,
    });
  }
};

export const getNewsletterStats = async (req, res) => {
  try {
    const [activeSnapshot, totalSnapshot, unsubscribedSnapshot] =
      await Promise.all([
        newsletterCollection.where("status", "==", "active").get(),
        newsletterCollection.get(),
        newsletterCollection.where("status", "==", "unsubscribed").get(),
      ]);

    const stats = {
      total: totalSnapshot.size,
      active: activeSnapshot.size,
      unsubscribed: unsubscribedSnapshot.size,
      unsubscribeRate:
        totalSnapshot.size > 0
          ? ((unsubscribedSnapshot.size / totalSnapshot.size) * 100).toFixed(2)
          : 0,
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching newsletter stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch newsletter statistics",
      details: error.message,
    });
  }
};

export const deleteNewsletterSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Subscription ID is required",
      });
    }

    // Check if subscription exists
    const subscriptionDoc = await newsletterCollection.doc(id).get();

    if (!subscriptionDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Subscription not found",
      });
    }

    // Delete the subscription
    await newsletterCollection.doc(id).delete();

    res.status(200).json({
      success: true,
      message: "Newsletter subscription deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting newsletter subscription:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete subscription",
      details: error.message,
    });
  }
};

export const getNewsletterStatus = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    const subscription = await newsletterCollection
      .where("email", "==", email.toLowerCase())
      .get();

    if (subscription.empty) {
      return res.status(200).json({
        success: true,
        data: {
          isSubscribed: false,
          status: null,
        },
      });
    }

    const subscriptionDoc = subscription.docs[0];
    const subscriptionData = subscriptionDoc.data();

    res.status(200).json({
      success: true,
      data: {
        isSubscribed: subscriptionData.status === "active",
        status: subscriptionData.status,
        subscribedAt: subscriptionData.subscribedAt,
        source: subscriptionData.source,
      },
    });
  } catch (error) {
    console.error("Error checking newsletter status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check newsletter status",
      details: error.message,
    });
  }
};
