import { db } from '../config/firebase.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

/**
 * Script to set a user as admin
 * Usage: node scripts/setAdminRole.js <user-email>
 * Example: node scripts/setAdminRole.js admin@gametribe.com
 */

const setAdminRole = async (email) => {
  try {
    if (!email) {
      console.error('❌ Error: Please provide a user email');
      console.log('Usage: node scripts/setAdminRole.js <user-email>');
      process.exit(1);
    }

    console.log(`🔍 Looking for user with email: ${email}`);

    // Find user by email
    const usersSnapshot = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.error(`❌ User not found with email: ${email}`);
      console.log('\nPlease make sure:');
      console.log('1. The user has logged in at least once');
      console.log('2. The email address is correct');
      process.exit(1);
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    console.log(`\n✅ Found user: ${userData.displayName || 'Unknown'} (${email})`);
    console.log(`   User ID: ${userId}`);

    // Update user role to admin
    await db.collection('users').doc(userId).update({
      role: 'admin',
      updatedAt: new Date().toISOString()
    });

    console.log('\n🎉 Successfully set user as admin!');
    console.log(`   ${email} now has admin privileges`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting admin role:', error);
    process.exit(1);
  }
};

// Get email from command line arguments
const email = process.argv[2];
setAdminRole(email);

