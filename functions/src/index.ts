import * as admin from 'firebase-admin'
import { onObjectFinalized } from 'firebase-functions/v2/storage'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import sharp from 'sharp'

admin.initializeApp()

// Generates optimized thumbnails for uploaded workout media.
export const generateWorkoutThumbnail = onObjectFinalized(async (event: any) => {
  const object = event.data
  const bucketName = object.bucket
  const filePath = object.name

  if (!bucketName || !filePath) return
  if (!filePath.startsWith('workout-media/')) return
  if (filePath.includes('_thumb_')) return

  const bucket = admin.storage().bucket(bucketName)
  const originalFile = bucket.file(filePath)
  const [originalBuffer] = await originalFile.download()

  const thumbnailBuffer = await sharp(originalBuffer)
    .rotate()
    .resize({ width: 360, withoutEnlargement: true })
    .jpeg({ quality: 78 })
    .toBuffer()

  const thumbPath = filePath.replace(/(\.[^./]+)?$/, '_thumb_360.jpg')
  const thumbFile = bucket.file(thumbPath)
  await thumbFile.save(thumbnailBuffer, {
    metadata: {
      contentType: 'image/jpeg',
      cacheControl: 'public,max-age=604800'
    }
  })
})

export const onClassCreated = onDocumentCreated('classes/{classId}', async (event: any) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const classData = snapshot.data();
  
  const traineeIds = classData.traineeIds || [];
  if (!Array.isArray(traineeIds) || traineeIds.length === 0) return;

  const db = admin.firestore();
  const tokens: string[] = [];

  for (const uid of traineeIds) {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData?.fcmToken) {
        tokens.push(userData.fcmToken);
      }
    }
  }

  if (tokens.length === 0) return;

  try {
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: '새로운 클래스에 초대되었습니다!',
        body: '트레이너님이 클래스를 생성하고 회원님을 초대했습니다. 확인해보세요!'
      }
    });
    console.log(`Successfully sent messages: ${response.successCount} success, ${response.failureCount} failed.`);
  } catch (error) {
    console.error('Error sending multicast message:', error);
  }
});
