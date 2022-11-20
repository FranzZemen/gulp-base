# Read Me

This is a base package for building and publishing javascript and/or typescript applications using gulp, creating a
set of convenient packaging functionality for typescript and javascript projects.

The package gulp-base can be used to build and publish CommonJS packages, ECMAScript packages, _or both_ into one
distribution package. CommonJS is still heavily leveraged and may continue to be owing to its prevalence and
synchronous module loading capabilities. There is no telling how long this module loading standard will be around,
however leveraging gul-base **you** don't need to worry about it.

# Install

```` javascript
npm i gulp-base --save-dev
````

# Creating or converting an existing repo

Use these instructions as a guide for creating or converting an existing repo to gulp-base. The instructions are
written for a new repo, however can easily be followed to understand how to convert an existing repo.

## Dependencies

1. **Nodejs** Ensure the latest stable [node](https://www.nodejs.org) release is installed. Versions
   earlier than 16.x.x have not been tested, but let us know if they work or what issues you encounter!
2. **NPM** Ensure you have  NPM >= 5.2 installed so that npx is supported.  If not, you will have to use alternative 
   commands.
3. Installing this package will install typescript locally.  If you want to run tsc globally, install typescript 
   globally. If you have it installed globally, compare typescript versions to better understand issues, if they occur.
4. Per gulp.js instructions, install gulp-cli globally.

## Install gulp-base

```` 
npm i gulp-base --save-dev
````

## Optionally, automatically create the scaffolding with defaults and user input where needed

```` 
npx gbscaffold
````

The scaffolding consists of directories, base packages and files.  Some defaults are requested as part of running 
gbscaffold, while others are assumed.  All defaults can be overriden in the final scaffolding.  The scaffolding 
created is described below in [Scaffolding](#scaffolding)




[1]: https://www.google.com

<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>


# Scaffolding




