
  // name: transitionName,
  // uuid: uuid,
  // ordinal: transitionNumber,
  // complete: false,
  // error: null,
  // errorStack: null,
  // destination: null,
  // requeue: null,
  // wait: null,
  // startingState: startingStateUUID,
  // endingState: null
const {onUpdateTrigger} = require('../KnexFuns')
const table = 'subexigent_transition'

exports.up = function(knex, Promise) {
  return knex.schema.createTable(table, (t) => {
    t.uuid('uuid').defaultTo(knex.raw('uuid_generate_v4()')).primary()

    t.string('name')
    t.integer('ordinal').unsigned()
    t.boolean('complete')
    t.boolean('error')
    t.text('errorStack')
    t.string('destination')
    t.boolean('requeue')
    t.integer('wait').unsigned()

    t.uuid('startingState').notNull()
    t.foreign('startingState').references('subexigent_state.uuid').onDelete('CASCADE').onUpdate('CASCADE')
    t.uuid('endingState')
    t.foreign('endingState').references('subexigent_state.uuid').onDelete('CASCADE').onUpdate('CASCADE')


    t.uuid('task_uuid').notNull()
    t.foreign('task_uuid').references('subexigent_task.uuid').onDelete('CASCADE').onUpdate('CASCADE')
    t.timestamp('created_at').defaultTo(knex.fn.now()).notNull();
    t.timestamp('updated_at').defaultTo(knex.fn.now()).notNull()
    t.timestamp('ended_at')
    t.timestamp('deleted_at').nullable();
  })
    .then(() => {
      return knex.raw(onUpdateTrigger(table))
    })


};

exports.down = function(knex, Promise) {
  return knex.schema.dropTableIfExists('subexigent_transition')
};;
