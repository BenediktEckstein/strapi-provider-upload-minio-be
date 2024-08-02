const Minio = require('minio')
const mime2 = require('mime-types')


module.exports = {
    init(providerOptions) {
        const {
            port,
            useSSL,
            endPoint,
            accessKey,
            secretKey,
            bucket,
            folder,
            host,
        } = providerOptions
        const isUseSSL = useSSL === 'true' || useSSL === true
        let MINIO = new Minio.Client({
            endPoint,
            port: +port || 9000,
            useSSL: isUseSSL,
            accessKey,
            secretKey,
        })
        const getUploadPath = (file) => {
            const pathChunk = file.path ? `${file.path}/` : ''
            const path = folder ? `${folder}/${pathChunk}` : pathChunk

            return `${path}${file.hash}${file.ext}`
        }

        const getFilePath = (file) => {
            let folder = process.env.MINIO_FOLDER ?? "cms";

            // const hostPart = getHostPart() + bucket + '/'
            const path = file.url.replace(new RegExp('[\\s\\S]+/' + folder + '/'), folder + '/')


            return path
        }
        return {
            bucket,
            client: MINIO,
            uploadStream(file) {
                return this.upload(file)
            },
            upload(file) {
                return new Promise((resolve, reject) => {
                    const path = getUploadPath(file)
                    const metaData = {
                        'Content-Type': mime2.lookup(file.ext) || 'application/octet-stream',
                    }
                    MINIO.putObject(
                        bucket,
                        path,
                        file.stream || Buffer.from(file.buffer, 'binary'),
                        metaData,
                        (err, _etag) => {
                            if (err) {
                                return reject(err)
                            }
                            const hostPart = process.env.EXTERNAL_BACKEND_URL;
                            file.url = hostPart + '/api/download/' + path
                            resolve(undefined);
                        },
                    )
                })
            },
            delete(file) {
                return new Promise((resolve, reject) => {
                    const path = getFilePath(file)

                    MINIO.removeObject(bucket, path, (err) => {
                        if (err) {
                            return reject(err)
                        }

                        resolve(undefined)
                    })
                })
            },
        }
    },
}
