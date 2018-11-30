/**
 * @file PgStore
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import Bluebird from 'bluebird'
import Knex from 'knex'
import {Config as KnexConfig, PoolConfig} from 'knex'
import {Store, TaskSettings, TaskUpdate, TransitionUpdate} from "./Store"

import {
  reduceObjProps,
  simpleDefaultTask,
  simpleDefaultTransition
} from "./StoreHelpers";

export interface SimplePGConfig {
  user: string,
  host: string,
  password: string,
  database: string
  poolMin: number,
  poolMax: number,
  debug?: boolean
}

export class PGStore implements Store {
  id: number
  uuid: string
  private client: Knex

  constructor(simpleClientConfig: SimplePGConfig, KnexConfig?: KnexConfig) {
    if(KnexConfig){
      this.client = Knex(KnexConfig)
    } else {
      this.client = Knex({
        client: 'pg',
        connection: {
          user: simpleClientConfig.user,
          host: simpleClientConfig.host,
          password: simpleClientConfig.password,
          database: simpleClientConfig.database
        },
        pool: {
          min: simpleClientConfig.poolMin,
          max: simpleClientConfig.poolMax
        },
        debug: !!simpleClientConfig.debug
      })
    }
  }

  createTask(taskSettings: TaskSettings) {
    let t = simpleDefaultTask(taskSettings)
    return this.client('subexigent_task')
      .insert(t)
      .returning('*')
      .then((data) => {
        return data[0]
      })
  }

  getTask(taskUuid: string, allData?: boolean) {
    return this.client('subexigent_task')
      .where({uuid: taskUuid})
      .then((data) => {
        return data[0]
      })
  }
  updateTask(taskUuid: string, updateData: TaskUpdate) {
    let update
    return this.getTask(taskUuid, true)
      .then((data) => {
        update = reduceObjProps<TaskUpdate>(data, updateData)
        return this.client('subexigent_task')
          .where({uuid: taskUuid})
          .returning('*')
          .update(update)
      })
      .then((data) => {
        return data[0]
      })
  }

  createTransition(taskUuid: string, transitionName: string, stateUuid: string, transitionNumber: number) {
    let tr = simpleDefaultTransition(transitionName, stateUuid, transitionNumber)
    tr.task_uuid = taskUuid
    return this.client('subexigent_transition')
      .insert(tr)
      .returning('*')
      .then((data) => {
        return data[0]
      })
  }

  getTransition(taskUuid: string, transitionUuid: string) {
    return this.client('subexigent_transition')
      .where({uuid: transitionUuid})
      .then((data) => {
        return data[0]
      })
  }

  updateTransition(taskUuid: string, transitionUuid: string, updateData: TransitionUpdate) {
    let update
    return this.getTransition(taskUuid, transitionUuid)
      .then((data) => {

        update = reduceObjProps<TaskUpdate>(data, updateData)
        return this.client('subexigent_transition')
          .where({uuid: transitionUuid})
          .returning('*')
          .update(update)
      })
      .then((data) => {
        return data[0]
      })
  }

  findTransition(taskUuid: string, ordinal: number){
    return this.client('subexigent_transition')
      .where({task_uuid: taskUuid, ordinal: ordinal})
      .then((data) => {
        return data[0] || null
      })
  }

  createState(taskUuid: string, state: any) {

    return this.client('subexigent_state')
      .insert({task_uuid: taskUuid, state: state})
      .returning('*')
      .then((data) => {
        return data[0]
      })
  }

  getState(taskUuid: string, stateUuid: string) {
    return this.client('subexigent_state')
      .where({uuid: stateUuid})
      .then((data) => {
        return data[0]
      })
  }

  closeStore(){
    return this.client.destroy()
  }

}