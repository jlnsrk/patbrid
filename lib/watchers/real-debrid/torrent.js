const debug = require('debug')('patbrid:watchers:real-debrid:torrent')
const fs = require('fs')

class RealDebridTorrent {
  constructor (client, downloadFn, file, magnetlink = null) {
    debug('ctor', file)

    this.client = client
    this.downloadFn = downloadFn
    this.file = file
    this.status = 'pending'
    this.magnetlink = magnetlink
  }

  addToQueue () {
    debug('addToQueue', this.file)

    let promise = null

    // Add the torrent file
    if (this.magnetlink !== null) {
      promise = this.client.torrents.addMagnet(this.magnetlink)
    } else {
      promise = this.client.torrents.addTorrent(this.file)
    }

    return promise.then(result => {
      // Set the id and mark as queued
      this.id = result.id
      this.status = 'queued'

      console.log(`[+] '${this.file}' added to queue (${this.id})`)

      return this._beginDownload()
    })
  }

  update () {
    debug('update', this.file)

    // Get the info for the torrent
    if (this.status !== 'downloaded') {
      return this.client.torrents.info(this.id)
        .then(info => this._handleUpdate(info))
        .catch(err => {
          debug('update failed', err)

          this.status = 'invalid'

          console.log(`[+] '${this.file}' is invalid`)

          Promise.resolve(null)
        })
    }
  }

  _beginDownload () {
    debug('_beginDownload', this.file)

    // Select all the files for download
    return this.client.torrents.selectFiles(this.id, 'all')
      .then(() => {
        this.status = 'downloading'

        console.log(`[+] '${this.file}' downloading remotely`)
      })
  }

  _handleUpdate (info) {
    debug('_handleUpdate', this.file, info)

    // Show torrent status
    console.log(`[+] '${this.file}' id: ${this.id} local: ${this.status} remote: ${info.status} progress: ${info.progress}%`)

    // Has the remote status finished downloading
    if (info.status === 'downloaded' && this.status === 'downloading') {
      // Mark torrent as downloaded
      this.status = 'downloaded'

      // Get the download links
      this._getDownloadLinks(info.links)
        // Add all download links to downloader
        .then(results => {
          const path = this.file.substr(0, this.file.lastIndexOf('/'))
          console.log(`[+] '${this.file}' downloading locally to:'${path}'`)

          const urls = results.map(result => result.download)

          return this.downloadFn(urls, path)
        })
        // Delete the torrent
        .then(() => this._delete())
        // Catch any errors
        .catch(err => console.error('[!] _handleUpdate failed', err))
    }
  }

  _getDownloadLinks (links) {
    debug('_getDownloadLinks', this.file)

    // Go through each link in the info json
    const promises = links.map(link =>
      // Unrestrict the link
      this.client.unrestrict.link(link)
        .catch(err => {
          console.log(`[!] _getDownloadLink(${link}) failed`, err)

          return Promise.resolve(null)
        })
    )

    // Wait for all links to resolve and remove bad links
    return Promise.all(promises)
      .then(results => results.filter(x => !!x))
  }

  _delete () {
    debug('_delete', this.file)

    // Delete the torrent
    return this.client.torrents.delete(this.id)
      .then(() => {
        this.status = 'invalid'

        fs.unlinkSync(this.file)

        console.log(`[+] '${this.file}' deleted`)
      })
      .catch(err => console.error('[!] delete failed', err))
  }
}

module.exports = RealDebridTorrent
