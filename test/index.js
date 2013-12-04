var level = require('level')
var Users = require('../index')
var rimraf = require('rimraf')
var tap = require('tap')
var test = tap.test

var sublevel = require('level-sublevel')
var db = sublevel(level('./db'))
var users = Users(db)

test('create, get and delete a user', function (t) {

  t.plan(6)

  var user = {
    username: 'test',
    password: 'pass',
    foo: 100,
    email: 'test@tap.com'
  }

  users.addIndexes(['username'], function(err) {

    users.create(user, function(err, id) {
      if (err) {
        t.notOk(true, err)
        return t.end()
      }
      t.ok(id, 'the create method should return the id of the new user')

      users.get(id, function(err, user) {

        t.equal(user.username, 'test', 'username matches')
        t.equal(user.password, undefined, 'original password was removed')
        t.equal(!!user.salt, true, 'salt was created')
        t.equal(user.foo, 100, 'arbitrary member found')

        users.remove(id, function(err) {
          if (err) {
            t.notOk(true, 'could not remove record')
            return t.end()
          }
          t.ok(true, 'removed the record')
          t.end()
        })
      })

    })
  })
})

test('dont allow duplicate users', function (t) {

  t.plan(2)

  var user = {
    username: 'test',
    password: 'pass',
    email: 'test@tap.com'
  }

  users.create(user, function(err, id) {
    if (err) {
      t.notOk(true, err)
      return t.end()
    }

    users.create(user, function(err) {
      if (err) {
        t.ok(err, 'an error was thrown about the duplicate user')

        users.remove(id, function(err) {
          if (err) {
            t.notOk(true, 'could not remove record')
            return t.end()
          }
          t.ok(true, 'removed the record')
          t.end()
        })
      }
      else {
        t.notOk(true, 'dupicate user created')
      }
    })
  })
})

test('index on an arbitrary field and get the user by that index, remove all indexes', function (t) {

  t.plan(2)

  var user = {
    username: 'test',
    password: 'pass',
    email: 'test@tap.com'
  }

  users.addIndexes(['email'], function(err) {

    users.create(user, function(err, id) {
      if (err) {
        t.notOk(true, err)
        return t.end()
      }
      users.get({ email: 'test@tap.com' }, function(err, _id) {
        t.equal(id, _id, 'getting a user by an index should return the id')
        users.remove(id, function(err) {
          if (err) {
            t.notOk(true, 'could not remove record')
            return t.end()
          }
          t.ok(true, 'removed the record')
          t.end()
        })
      })
    })
  })
})

test('create and auth a user', function (t) {

  t.plan(2)

  var user = {
    username: 'test',
    password: 'pass',
    email: 'test@tap.com'
  }

  users.create(user, function(err, id) {
    if (err) {
      t.notOk(true, err)
      return t.end()
    }
    users.auth(id, 'pass', function(err, user, put) {
      t.ok(!!user, 'the user authed')
      users.remove(id, function(err) {
        if (err) {
          t.notOk(true, 'could not remove record')
          return t.end()
        }
        t.ok(true, 'removed the record')
        t.end()
      })
    })
  })
})

test('create and notOk to auth a user', function (t) {

  t.plan(2)

  var user = {
    username: 'test',
    password: 'ass',
    email: 'test@tap.com'
  }

  users.create(user, function(err, id) {
    if (err) {
      t.notOk(true, err)
      return t.end()
    }
    users.auth(id, 'pass', function(err, user, put) {
      t.ok(!user, 'the user notOked to auth')
      users.remove(id, function(err) {
        if (err) {
          t.notOk(true, err)
          return t.end()
        }
        t.ok(true, 'removed the record')
        t.end()
      })
    })
  })
})

test('add groups to a user', function (t) {

  t.plan(2)

  var user = {
    username: 'test',
    password: 'ass',
    email: 'test@tap.com'
  }

  users.create(user, function(err, id) {
    if (err) {
      t.notOk(true, err)
      return t.end()
    }
    users.addGroups(id, ['super','rooty'], function(err, user, put) {
      if (err) {
        t.notOk(true, err)
        return t.end()
      }
      put(user, function(err) {
        if (err) {
          t.notOk(true, err)
          return t.end()
        }
        users.get(id, function(err, user) {
          t.deepEqual(user.groups, ["super", "rooty"])
          users.remove(id, function(err) {
            if (err) {
              t.notOk(true, err)
              return t.end()
            }
            t.ok(true, 'removed the record')
            t.end()
          })
        })
      })
    })
  })
})

test('remove groups from a user', function (t) {

  t.plan(1)

  var user = {
    username: 'test',
    password: 'ass',
    email: 'test@tap.com'
  }

  function puppies(id, fn) {
    fn(user, function(err) {
      if (err) {
        t.notOk(true, err)
        return t.end()
      }
      users.removeGroups(id, ['rooty'], function(err, user, remove) {
        if (err) {
          t.notOk(true, err)
          return t.end()
        }
        kittens(id, remove)
      })
    })
  }

  function kittens(id, fn) {
    fn(user, function(err) {
      if (err) {
        t.notOk(true, err)
        return t.end()
      }
      users.get(id, function(err, user) {
        t.deepEqual(user.groups, ['super'])
        rimraf('./db', function() {
          t.end()
        })
      })
    })
  }

  users.create(user, function(err, id) {
    if (err) {
      t.notOk(true, err)
      return t.end()
    }
    users.addGroups(id, ['super','rooty'], function(err, user, add) {
      if (err) {
        t.notOk(true, err)
        return t.end()
      }
      puppies(id, add)
    })
  })
})

