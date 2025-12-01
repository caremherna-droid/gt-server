import { db } from "../../config/firebase.js";

const faqsCollection = db.collection("faqs");
const faqCategoriesCollection = db.collection("faqCategories");

// Helper function to handle collection operations
const handleCollectionOperation = async (operation) => {
  try {
    return await operation();
  } catch (error) {
    console.error("Firebase operation error:", error);
    throw new Error(error.message);
  }
};

// FAQ Categories
export const addFaqCategory = async (req, res) => {
  try {
    const categoryData = {
      name: req.body.name,
      createdAt: new Date(),
    };

    const docRef = await faqCategoriesCollection.add(categoryData);
    const category = {
      id: docRef.id,
      ...categoryData,
    };

    res.status(201).json(category);
  } catch (error) {
    console.error("Error adding FAQ category:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getAllFaqCategories = async (req, res) => {
  try {
    const snapshot = await faqCategoriesCollection.orderBy("name").get();
    const categories = [];

    snapshot.forEach((doc) => {
      categories.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json(categories);
  } catch (error) {
    console.error("Error getting FAQ categories:", error);
    res.status(500).json({ error: error.message });
  }
};

export const updateFaqCategory = async (req, res) => {
  try {
    const categoryRef = faqCategoriesCollection.doc(req.params.id);
    const doc = await categoryRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Category not found" });
    }

    await categoryRef.update({
      name: req.body.name,
      updatedAt: new Date(),
    });

    const updatedDoc = await categoryRef.get();
    const category = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    };

    res.status(200).json(category);
  } catch (error) {
    console.error("Error updating FAQ category:", error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteFaqCategory = async (req, res) => {
  try {
    const categoryRef = faqCategoriesCollection.doc(req.params.id);
    const doc = await categoryRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Category not found" });
    }

    await categoryRef.delete();
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting FAQ category:", error);
    res.status(500).json({ error: error.message });
  }
};

// FAQs
export const addFaq = async (req, res) => {
  try {
    const faqData = {
      question: req.body.question,
      answer: req.body.answer,
      category: req.body.category,
      order: req.body.order || 0,
      isActive: req.body.isActive || true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await faqsCollection.add(faqData);
    const faq = {
      id: docRef.id,
      ...faqData,
    };

    res.status(201).json(faq);
  } catch (error) {
    console.error("Error adding FAQ:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getAllFaqs = async (req, res) => {
  try {
    // Use a simpler query first to isolate potential issues
    const snapshot = await faqsCollection.get();

    const faqs = [];
    snapshot.forEach((doc) => {
      try {
        // Add error handling for each document processing
        const data = doc.data();
        faqs.push({
          id: doc.id,
          ...data,
        });
      } catch (docError) {
        console.error(`Error processing FAQ document ${doc.id}:`, docError);
        // Continue processing other documents
      }
    });

    console.log(`Successfully retrieved ${faqs.length} FAQs`);
    res.status(200).json(faqs);
  } catch (error) {
    console.error("Error getting FAQs:", error);
    // Send more detailed error information in development
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

export const getFaqById = async (req, res) => {
  try {
    const doc = await faqsCollection.doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    const faq = {
      id: doc.id,
      ...doc.data(),
    };

    res.status(200).json(faq);
  } catch (error) {
    console.error("Error getting FAQ by ID:", error);
    res.status(500).json({ error: error.message });
  }
};

export const updateFaq = async (req, res) => {
  try {
    const faqRef = faqsCollection.doc(req.params.id);
    const doc = await faqRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date(),
    };

    await faqRef.update(updateData);

    const updatedDoc = await faqRef.get();
    const faq = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    };

    res.status(200).json(faq);
  } catch (error) {
    console.error("Error updating FAQ:", error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteFaq = async (req, res) => {
  try {
    const faqRef = faqsCollection.doc(req.params.id);
    const doc = await faqRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    await faqRef.delete();
    res.status(200).json({ message: "FAQ deleted successfully" });
  } catch (error) {
    console.error("Error deleting FAQ:", error);
    res.status(500).json({ error: error.message });
  }
};
