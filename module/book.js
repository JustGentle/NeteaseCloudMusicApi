// 点歌
const fs = require('fs')
const path = require('path')

module.exports = (query, request) => {
  var pm = new Promise(function (resolve, reject) {
    var result = {
      status: 200,
      body: {
        code: 500,
        msg: '',
        error: null,
        result: []
      }
    };

    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const data = {
      action: query.action || 0, // 0: 读取 1: 保存
      key: query.key || today.getTime(),
      data: query.data || []
    }

    var dir = path.join(__dirname, `../store`);
    var file = path.join(__dirname, `../store/book-${data.key}.json`);

    try {
      if (data.action == '1') {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir);
        }
        fs.writeFileSync(file, decodeURIComponent(data.data));
        result.body.code = 200;
      } else {
        var exists = fs.existsSync(file);
        if (exists) {
          var content = fs.readFileSync(file) || '[]';
          result.body.result = JSON.parse(content);
          result.body.code = 200;
        } else {
          result.body.code = 404;
          result.body.msg = `文件不存在:${file}`;
        }
      }
    } catch (error) {
      result.body.code = 500;
      result.body.error = error;
    }
    resolve(result);
  });
  return pm;
}