import * as admin from 'firebase-admin'
import { onObjectFinalized } from 'firebase-functions/v2/storage'
import sharp from 'sharp'

admin.initializeApp()

// Generates optimized thumbnails for uploaded workout media.
export const generateWorkoutThumbnail = onObjectFinalized(async (event) => {
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

