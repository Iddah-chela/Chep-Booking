#!/usr/bin/env node
import dotenv from 'dotenv'
import connectDB from './config/db.js'
import cloudinary, { connectCloudinary } from './config/cloudinary.js'
import AgentVacancy from './models/agentVacancy.js'

dotenv.config({ path: './.env' })

const args = process.argv.slice(2)
const applyChanges = args.includes('--apply')
const limitArgIndex = args.findIndex(a => a === '--limit')
const limit = limitArgIndex >= 0 && args[limitArgIndex + 1] ? Number(args[limitArgIndex + 1]) : null

async function main() {
  console.log('🔧 generateVideoThumbnails starting')

  await connectDB()
  await connectCloudinary()

  // Find vacancies that have videos
  const query = { 'videos.0': { $exists: true } }
  const cursor = AgentVacancy.find(query).cursor()

  let processed = 0
  let updated = 0

  for await (const vac of cursor) {
    if (limit && processed >= limit) break
    processed++

    let shouldSave = false
    for (let i = 0; i < (vac.videos || []).length; i++) {
      const vid = vac.videos[i]
      if (!vid) continue
      // Skip if already has thumbnail
      if (vid.thumbnail) continue

      // Need publicId to generate a reliable Cloudinary-derived thumbnail
      if (!vid.publicId) {
        console.warn(`- vacancy ${vac._id} video[${i}] missing publicId; skipping`)
        continue
      }

      try {
        // Generate a JPG thumbnail URL derived from the video resource
        const thumb = cloudinary.url(vid.publicId, {
          resource_type: 'video',
          format: 'jpg',
          transformation: [
            { width: 1200, height: 800, crop: 'fill' },
            { quality: 'auto' }
          ],
          secure: true,
        })

        console.log(`+ vacancy ${vac._id} video[${i}] -> thumbnail ${thumb}`)
        vac.videos[i].thumbnail = thumb
        shouldSave = true
      } catch (err) {
        console.error(`! failed to generate thumbnail for vacancy ${vac._id} video[${i}]:`, err.message || err)
      }
    }

    if (shouldSave) {
      if (applyChanges) {
        await vac.save()
        updated++
        console.log(`✓ saved vacancy ${vac._id}`)
      } else {
        console.log(`(dry-run) would save vacancy ${vac._id}`)
      }
    }
  }

  console.log(`Done. processed=${processed} updated=${updated} (applyChanges=${applyChanges})`)
  process.exit(0)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
