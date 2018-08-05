# learning-graphql

## Create user
```
https://github.com/login/oauth/authorize?client_id=YOUR-ID-HERE&scope=user

mutation {
  githubAuth(code:<CODE_HERE>){
    token
    user {
      githubLogin
      name
      avatar
    }
  }
}

```
