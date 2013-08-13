# SYNOPSIS
Store and get users. Salt their passwords, persist them to disk.

# USAGE
Pass a leveldb instance to the `Users` constructor. I recommend using
[`sublevel`][0] to bucket your database's meta data and [`multilevel`][1]
if your database is on the network.

```js
var db = level('./db')
var users = Users(db)
```

# API

### `create`
Create a new user by passing a user object. Only `username` is required.
When a new user is created, a uuid is returned.

```js
var user = {
  username: 'test',
  password: 'pass',
  foo: 100,
  email: 'test@tap.com'
}

users.create(user, function(err, id) {
  // id => 'a3a1d270-75fe-4bfc-a2bc-e358903bc540'
})
```

### `remove`
Removes a user and any indexs that have been created for their records

```js
users.remove(id, function(err) {
})
```

### `addIndexes`
Add indexes that can be used to `get` a user. You can use any arbitrary 
field that is in your user object. In this example we index on `email`.

```js
users.addIndexes(['email'], function(err) {
})
```

### `get`
Get a user by their uuid.

```js
users.get(id, function(err, user) {
})
```

Here's an example using an index.

```js
users.get({ email: 'test@tap.com' }, function(err, id) {
})
```

### `auth`
Find out if the proposed password matches with the a salt stored for a 
given user id. If auth is successful, you get a the user object and
a put function so that you can write some new user information. If the
auth fails, the `user` object will be null.

```js
users.auth(id, password, function(err, user, put) {
  user.isCool = true
  put(user, function(err) {
    // ...
  })
})
```

[0]:https://github.com/dominictarr/level-sublevel
[1]:https://github.com/juliangruber/multilevel
