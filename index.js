var bcrypt = require('bcrypt')
var uuid = require('node-uuid')

module.exports = Users
var sep = '\xff'
var storedIndexesKey = sep + 'INDEXES' + sep
var indexPrefix = sep + 'INDEX' + sep
var opts = { valueEncoding: 'json' }

function Users(opts) {

  if (!(this instanceof Users)) {
    return new Users(opts)
  }

  if (opts && (opts._events || opts.sublevels)) {
    this.db = opts
  }
  else if (!opts || !opts.db) {
    throw new Error('requires a leveldb instance')
  }
  else {
    this.db = opts.db
  }

  this.prefix = ''
  if (opts.prefix) {
    if (typeof opts.prefix == 'string') {
      this.prefix = opts.prefix
    } else if (typeof opts.prefix == 'function') {
      this.prefix = opts.prefix()
    }
  }
}

Users.prototype.get = function get(id, cb) {
  var users = this
  var key
  var index

  if (typeof id === 'string') {
    key = users.prefix + id
  }
  else {
    index = Object.keys(id)[0]
    key = [
      users.prefix,
      indexPrefix,
      index,
      sep,
      id[index]
    ].join('')
  }

  users.db.get(key, opts, function(err, user) {
    if (err) {
      return cb(err)
    }

    function put(key, cb) {
      var key = users.prefix + id
      users.db.put(key, user, opts, cb)
    }

    cb(null, user, put)
  })
}

Users.prototype.addIndexes = function(newIndexs, cb) {
  var users = this
  users.get(storedIndexesKey, function(err, indexes, put) {

    if (err) {
      return users.db.put(storedIndexesKey, ['username'], opts, cb)
    }
    newIndexs.forEach(function(index, i) {
      if (indexes.indexOf(index) < 0) {
        indexes.push(index)
      }
    })

    put(indexes, cb)
  })
}

Users.prototype.getIndexes = function(index, cb) {
  this.get(storedIndexesKey, cb)
}

Users.prototype.create = function(user, cb) {

  var users = this

  if (!user.username) {
    return cb(new Error('`username` required'))
  }

  if (!user.groups) {
    user.groups = []
  }

  var ops = []

  var id = uuid.v4()
  var key = users.prefix + id

  users.get(storedIndexesKey, function(err, indexes) {

    if (err) {
      return cb(err)
    }

    users.get({ username: user.username }, function(err) {
      if (!err) {
        return cb(new Error('User already exists'))
      }

      indexes.forEach(function(index) {
        if (user[index]) {

          var key = [
            users.prefix,
            indexPrefix,
            index,
            sep,
            user[index]
          ].join('')

          ops.push({
            type: 'put',
            key: key,
            value: id 
          })
        }
      })

      function batch(user) {

        ops.push({ type: 'put', key: users.prefix + id, value: user })

        users.db.batch(ops, opts, function(err) {
          if (err) {
            return cb(err)
          }
          cb(null, id)
        })
      }

      if (user.password) {
        bcrypt.hash(user.password, 5, function(err, bcryptedPassword) {
          if (err) {
            return cb(err)
          }
          user.salt = bcryptedPassword
          delete user.password
          batch(user)
        })
      }
      else {
        batch(user)
      }
    })
  })
}

Users.prototype.removeGroups = function(id, groups, cb) {
  this.get(id, function(err, user, put) {
    if (err) {
      return cb(err)
    }
    groups.forEach(function(group, index) {
      var pos = user.groups.indexOf(group)
      if (pos > -1) {
        user.groups.splice(pos, 1)
      }
    })
    cb(null, user, put)
  })
}

Users.prototype.addGroups = function(id, groups, cb) {
  this.get(id, function(err, user, put) {
    if (err) {
      return cb(err)
    }
    groups.forEach(function(group, index) {

      var pos = user.groups.indexOf(group)
      if (pos < 0) {
        user.groups.push(group)
      }
    })
    cb(null, user, put)
  })
}

Users.prototype.auth = function(id, password, cb) {

  var users = this

  if (!id || !password) {
    var msg = 'requires `id` and `password`.'
    var err = new Error(msg)
    return cb(err)
  }

  users.get(id, function(err, user, put) {
    if (err) {
      return cb(err)
    }

    bcrypt.compare(password, user.salt, function(err, match) {

      if (err) {
        return cb(err)
      }

      if (!match) {
        return cb(null)
      }
      cb(null, user, put)
    })
  })
}

Users.prototype.remove = function(id, cb) {

  var users = this
  var ops = []

  users.get(id, function(err, user) {

    if (err) {
      return cb(err)
    }

    ops.push({ type: 'del', key: users.prefix + id })

    users.get(storedIndexesKey, function(err, indexes) {
      if (err) {
        return cb(err)
      }

      indexes.forEach(function(index) {
        if (user[index]) {

          var key = [
            users.prefix,
            indexPrefix,
            index, 
            sep, 
            user[index]
          ].join('')

          ops.push({ 
            type: 'del', 
            key: key, 
            value: id
          })
        }
      })
      users.db.batch(ops, opts, cb)
    })
  })
}
