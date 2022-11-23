const debug = require('debug')('patbrid:downloaders:aria2')
const fs = require('fs')
const request = require('request')
const querystring = require('querystring')
// const { URL } = require('url')
// const http = require('http')

class inlinedownloader {
  constructor (watch, path) {
    debug('ctor')
    this.watch = watch
    this.path = path
    this.download = this._download.bind(this)
    this.status = this._status.bind(this)
    this.success = false
  }

  downloadFile (fileUrl) {
    let received = 0
    let total = 0
    let fileName = querystring.unescape(fileUrl)
    fileName = fileName.substr(fileName.lastIndexOf('/') + 1)

    console.log(this.path + '/' + fileName)

    const req = request({
      method: 'GET',
      uri: fileUrl
    })

    const out = fs.createWriteStream(this.path + '/' + 'test.mkv')
    req.pipe(out)

    req.on('response', data => {
      total = parseInt(data.headers['content-length'])
    })

    req.on('data', chunk => {
      received += chunk.length
    })
    req.on('error', function (e) {
      console.log(e)
    })

    req.on('timeout', function () {
      console.log('timeout')
      req.abort()
    })
    req.on('end', () => {
      console.log(this.path + '/' + fileName + ' downloaded(' + received + ' / ' + total + ')')
    })
  }

  _download (links, subpath, aria2info) {
    debug('_download', links)

    const promises = links.map(link => new Promise((resolve, reject) => {
      let received = 0
      let total = 0
      let fileName = querystring.unescape(link)
      fileName = fileName.substr(fileName.lastIndexOf('/') + 1)
      const itbe = subpath.substr(this.watch.length + 1)

      const req = request({
        method: 'GET',
        uri: link
      })

      console.log(this.path + '/' + itbe + '/' + fileName)

      fs.mkdir(this.path + '/' + itbe, { recursive: true }, (err) => {
        if (err) console.log(err)
      })

      const out = fs.createWriteStream(this.path + '/' + itbe + '/' + fileName)
      req.pipe(out)

      req.on('response', data => {
        total = parseInt(data.headers['content-length'])
      })

      req.on('data', chunk => {
        received += chunk.length
      })
      req.on('error', function (e) {
        reject(e)
      })

      req.on('timeout', function () {
        console.log('timeout')
        req.abort()
      })
      req.on('end', () => {
        console.log(this.path + '/' + fileName + ' downloaded(' + received + ' / ' + total + ')')
        resolve('done')
      })
    }))

    return Promise.all(promises)
  }

  _status (aria2info) {
  }
}

module.exports = inlinedownloader
