import fs from 'fs'
import {DIRECTIVES} from '@graphql-codegen/typescript-mongodb'
import {makeExecutableSchema} from '@graphql-tools/schema'
import bodyParser from 'body-parser'
import express from 'express'
import {graphqlHTTP} from 'express-graphql'
import {expressjwt as expressJWT} from 'express-jwt'
import type {Request as JWTRequest} from 'express-jwt'
import mongoose from 'mongoose'
import type {Context} from './context.js'
import {env} from './helpers/secrets.js'
import {resolvers} from './resolvers.js'

const {
	PORT,
	DB_NAME,
	DB_CLUSTER,
	DB_USERNAME,
	DB_PASSWORD,
	JWT_SECRET,
} = env

const DB_URI
= `mongodb+srv://${DB_USERNAME}:${DB_PASSWORD}@${DB_CLUSTER}`
+ `.mongodb.net/${DB_NAME}?retryWrites=true&w=majority`

const SCHEMA_FILE = 'src/schema.gql'

const main = async ( ) => {
	const app = express( )
	void mongoose.connect(DB_URI)

	// Import the schema's data types and build it with GraphQL.
	const rawSchema = await fs.promises.readFile(SCHEMA_FILE, 'utf8')
	const schema = makeExecutableSchema({
		typeDefs: [DIRECTIVES, rawSchema],
		resolvers: resolvers,
	})

	// Feed middleware & options to the express server.
	app.use(
		'/',
		bodyParser.json( ),
		expressJWT({
			secret: JWT_SECRET,
			algorithms: ['HS256'],
			credentialsRequired: false,
		}),
		graphqlHTTP((request, response, params) => {
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
			const jwtRequest = request as JWTRequest<Context>
			const payload = jwtRequest.auth ?? null

			return ({
				graphiql: false,
				schema: schema,
				context: payload,
			})
		}),
	)

	// Finally, start the express server.
	app.listen(PORT, ( ) => {
		console.info(`Server started on port ${PORT}.`)
		console.info(`http://localhost:${PORT}/`)
	})
}

void main( )
