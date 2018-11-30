

  // name: taskSettings.name,
  // uuid: uuid,
  // complete: false,
  // suspended: false,
  // error: false,
  // aborted: false,
  // abortError: null,
  // retryAttempts: 0,
  // retryDelay: taskSettings.retryDelay,
  // requeueCount: 0,
  // retriesRemaining: taskSettings.retriesRemaining,
  // currentTransition: 0,
const {onUpdateTrigger} = require('../KnexFuns')
const table = 'subexigent_task'

exports.up = function(knex, Promise) {
  return knex.raw('create extension if not exists "uuid-ossp"')
    .then(() => {
      return knex.schema.createTable(table, (t) => {
        // t.increments('id').primary()
        t.uuid('uuid').defaultTo(knex.raw('uuid_generate_v4()')).primary()
        t.string('name')
        t.boolean('complete')
        t.boolean('suspended')
        t.boolean('error')
        t.boolean('aborted')
        t.text('abortError')
        t.integer('retryAttempts').unsigned().notNull()
        t.integer('retryDelay').unsigned().notNull()
        t.integer('retriesRemaining').unsigned().notNull()
        t.integer('requeueCount').unsigned().notNull()
        t.integer('currentTransition').unsigned().notNull()
        t.timestamp('created_at').defaultTo(knex.fn.now()).notNull();
        t.timestamp('updated_at').defaultTo(knex.fn.now()).notNull()
        t.timestamp('ended_at')
        t.timestamp('deleted_at').nullable();

      })
    })
    .then(() => {
      return knex.raw(onUpdateTrigger(table))
    })

};

exports.down = function(knex, Promise) {
  return knex.schema.dropTableIfExists('subexigent_task').then(() => {
    return knex.raw('drop extension if exists "uuid-ossp"')
  })
};
