const chokidar = require('chokidar')
const RealDebridWatcher = require('./lib/watchers/real-debrid')
const InlineDownloader = require('./lib/downloaders/inline')

const {
  REAL_DEBRID_API_KEY,
  WATCH_DIR = '/watch',
  DOWNLOAD_DIR = '/download',
  WATCH_RATE = 5000
} = process.env

if (!REAL_DEBRID_API_KEY) {
  console.log('[!] REAL_DEBRID_API_KEY env var is not set')

  process.exit(-1)
}

// Create a downloader instance
const downloader = new InlineDownloader(WATCH_DIR, DOWNLOAD_DIR)

// Create a watcher instance
const watcher = new RealDebridWatcher(REAL_DEBRID_API_KEY, downloader.download)

// Watch for new torrent files
console.log(`[+] Watching '${WATCH_DIR}' for new torrents`)

chokidar
  .watch(`${WATCH_DIR}`, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: true,
    ignored: '(?<![^/])\\.',
    depth: 99
  })
  .on('add', path => {
    if (path.indexOf('/.') !== -1) {
      return
    }
    if (path.indexOf('.torrent') === -1 && path.indexOf('.magnet') === -1) {
      return
    }
    watcher.addTorrent(path)
  })

// Check the torrent watch list every "WATCH_RATE" ms
setInterval(() => watcher.checkWatchList(), WATCH_RATE)
// */
