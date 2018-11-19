/**
 * @file FileStore
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {Store, TaskUpdate} from "./Store"
import {pruneTaskRetVal} from "./StoreHelpers"
import {v4} from 'uuid'
import {ensureDirSync, readJson, writeJson} from "fs-extra"
import {join} from 'path'
import {first,filter,has,each,last, sortBy, get, getOr} from 'lodash/fp'
// import Promise from "bluebird";

// @ts-ignore
const uncappedeach = each.convert({cap: false})

export class FileStore implements Store{

  dirPath: string
  constructor(dirPath: string){
    this.dirPath = dirPath
    ensureDirSync(this.dirPath)
  }

  private jsonPath(toJoin: string) : string{
    return join(this.dirPath, `${toJoin}.json`)
  }

  findOrCreateState(taskUuid: string, stateUuid: string, state: any | null) {
    let storePath = this.jsonPath(taskUuid)
    let stateObj
    return readJson(storePath)
      .then((data) => {
        let existingState = stateUuid ? data.states[stateUuid] : null

        if(existingState) {
          stateObj = existingState
          return null
        }

        let uuid = v4()

        stateObj = {
          uuid: uuid,
          state: state
        }
        data.states[uuid] = stateObj
        return writeJson(storePath, data, {spaces: 2})
      })
      .then((result) => {
        return stateObj
      })
  }

  createState(taskUuid: string, state: any): any {
    let storePath = this.jsonPath(taskUuid)
    let uuid = v4()

    let stateObj = {
      uuid: uuid,
      state: state
    }

    return readJson(storePath)
      .then((data) => {
        data.states[uuid] = stateObj
        return writeJson(storePath, data, {spaces: 2})
      })
      .then(() => {
        return stateObj
      })
  }

  getState(taskUuid: string, stateUuid: string): any {
    let storePath = this.jsonPath(taskUuid)
    return readJson(storePath)
      .then((data) => {
        return data.states[stateUuid]
      })
  }

  findOrCreateTask(taskName: string, taskUuid?: string) : Promise<any> {
    if(taskUuid){
      let storePath = this.jsonPath(taskUuid)
      return readJson(storePath)
        .then((t) => {
          return {
            created: false,
            task: pruneTaskRetVal(t)
          }
        })
    }

    return this.createTask(taskName)
      .then((t) => {
        return {
          created: true,
          task: pruneTaskRetVal(t)
        }
      })

  }

  createTask(taskName: string) : any {
    let uuid = v4()
    let t = {
      name: taskName,
      uuid: uuid,
      complete: false,
      suspended: false,
      error: false,
      aborted: false,
      abortError: null,
      retryAttempts: 0,
      currentTransition: 0,
      states: {},
      transitions: {}
    }

    return writeJson(this.jsonPath(uuid),t, {spaces: 2})
      .then((res) => {
        return t
      })
  }

  getTask(taskUuid: string, allData: boolean): any {
    let storePath = this.jsonPath(taskUuid)
    return readJson(storePath)
      .then((task) => {
        let retVal = allData ? task : pruneTaskRetVal(task)
        return retVal
      })
  }

  closeTask(taskUuid: string) : any {
    let storePath = this.jsonPath(taskUuid)
    return readJson(storePath)
      .then((data) => {
        data.complete = true
        return writeJson(storePath, data, {spaces: 2})
      })
  }

  suspendTask(taskUuid: string, error?: Error | null): any {
    let storePath = this.jsonPath(taskUuid)
    return this.getTask(taskUuid, true)
      .then((data) => {
        data.error = !!error
        return writeJson(storePath, data, {spaces: 2})
      })
  }

  updateTask(taskUuid: string, updateData: TaskUpdate){
    let storePath = this.jsonPath(taskUuid)
    return this.getTask(taskUuid, true)
      .then((data) => {
        uncappedeach((v,k) => {
          if(has(k, data)){
            let current = data[k]
            data[k] = v(current)
          }
        }, updateData)

        return writeJson(storePath, data, {spaces: 2})
      })

  }

  createTransition(taskUuid: string, transitionName: string, transitionNumber: number, stateUuid: string) : any {
    let storePath = this.jsonPath(taskUuid)
    let trUuid = v4()

    let tr = {
      uuid: trUuid,
      name: transitionName,
      transition: transitionNumber,
      complete: false,
      error: null,
      destination: null,
      requeue: null,
      wait: null,
      startingState: stateUuid,
      endingState: null
    }

    return readJson(storePath)
      .then((data) => {
        data.currentTransition = transitionNumber
        data.transitions[trUuid] = tr
        return writeJson(storePath, data, {spaces: 2})
      })
      .then(() => {
        return trUuid
      })
  }

  getTransition(taskUuid: string, transitionUuid: string): any {
    let storePath = this.jsonPath(taskUuid)
    return readJson(storePath)
      .then((data) => {
        return data.transitions[transitionUuid]
      })
  }


  closeTransition(taskUuid: string, transitionUuid: string, stateUuid: string, transitionDestination: any,error?: Error){
    let storePath = this.jsonPath(taskUuid)
    return readJson(storePath)
      .then((task) => {
        let transition = task.transitions[transitionUuid]
        transition.endingState = stateUuid
        transition.error = error && error.stack || null
        transition.destination = getOr(null,'to',transitionDestination)
        transition.wait = getOr(0,'wait',transitionDestination)
        transition.requeue = getOr(false,'requeue', transitionDestination)
        transition.complete = !transition.error
        return writeJson(storePath, task, {spaces: 2})
      })
  }

  completeTransition(taskUuid: string, transitionUuid: string){
    let storePath = this.jsonPath(taskUuid)
    return readJson(storePath)
      .then((task) => {
        let transition = task.transitions[transitionUuid]
        transition.complete = true
        return writeJson(storePath, task, {spaces: 2})
      })
  }

  getLastTransition(taskUuid: string): any {
    return this.getTask(taskUuid, true)
      .then((result) => {
        // let incomplete = filter({complete: false}, result.transitions)
        // return first(incomplete)
        return last(sortBy(['row'], result.transitions))
      })
  }


}