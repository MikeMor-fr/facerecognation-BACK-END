const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

const db = knex({
	client: 'pg',
	connection: {
		connectionString: process.env.DATABASE_URL,
		ssl: true
	}
});

const app = express();

app.use(bodyParser.json());
app.use(cors());


// CHECKING IF IT'S WORKING WHEN CONNECTING TO THE ROOT
app.get('/', (req, res) => {
	res.send('it is working');
}) 


// SIGNIN STEP
app.post('/signin', (req, res) => {
	const {email, password} = req.body;
	if (!email || !password) {
		return res.status(400).json('incorrect form submission');
	}
	db.select('email', 'hash').from('login')
		.where('email', '=', req.body.email)
		.then(data => {
			const isValid = bcrypt.compareSync(password, data[0].hash);
			if (isValid) {
				return db.select('*').from('users').where('email', '=', email)
					.then(user => {
						res.json(user[0])
					})
					.catch(err => res.status(400).json('unable to get user'))
			} else {
				res.status(400).json('wrong credentials')
			}
		})
		.catch(err => res.status(400).json('wrong credentials'))
})


// REGISTER STEP
app.post('/register', (req, res) => {
	const {email, password, name} = req.body;
	if (!email || !password || !name) {
		return res.status(400).json('insocrrect form submission');
	}
	const hash = bcrypt.hashSync(password);
	db.transaction(trx => {
		trx.insert({
			hash: hash,
			email: email
		})
			.into('login')
			.returning('email')
			.then(loginEmail => {
				return trx('users')
					.returning('*')
					.insert({
						email: loginEmail[0],
						name: name,
						joined: new Date()
					})
					.then(user => {
						res.json(user[0]);
					})
			})
			.then(trx.commit)
			.catch(trx.rollback)
	})
	
		.catch(err => res.status(400).json('unable to register'))
})


// PROFILE STEP
app.get('/profile/:id', (req, res) => {
	const {id} = req.params;
	db.select('*').from('users').where('id', id).then(user => {
		if (user.length){
			res.json(user[0]);
		} else {
			res.status(400).json('Not Found')
		}
		
	})
		.catch(err => res.status(400).json('error getting user'))
})


// IMAGE STEP
app.put('/image', (req, res) => {
	const {id} = req.body;
	db('users').where('id', '=', id)
		.increment('entries', 1)
		.returning('entries')
		.then(entries => {
			res.json(entries[0]);
		})
		.catch(err => res.status(400).json('unable to get entries'))
})


app.listen(process.env.PORT || 3001, () => {
	console.log(`app is running on port ${process.env.PORT}`);
});



/*
/ --> res = this is working
/ sign in --> POST = succes/fail
/register --> POST = user
/profile/:userId --> GET = user
/image --> PUT = user
*/