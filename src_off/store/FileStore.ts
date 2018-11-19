/**
 * @file FileStore
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {Store} from "./Store"
import {v4} from 'uuid'
import {ensureDirSync, readJson, writeJson} from "fs-extra"
import {join} from 'path'
import {first,filter} from 'lodash/fp'

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

  createTask(taskName: string) : any {
    let uuid = v4()
    let td = {
      name: taskName,
      uuid: uuid,
      complete: false,
      retryCount: 0,
      currentTransition: 0,
      states: {},
      transitions: {}
    }

    return writeJson(this.jsonPath(uuid),td, {spaces: 2})
      .then((res) => {
        return uuid
      })
  }

  getTask(taskUuid: string): any {
    let storePath = this.jsonPath(taskUuid)
    return readJson(storePath)
  }

  closeTask(taskUuid: string) : any {
    let storePath = this.jsonPath(taskUuid)
    return readJson(storePath)
      .then((data) => {
        data.complete = true
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
      startingState: stateUuid
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


  closeTransition(taskUuid: string, transitionUuid: string, stateUuid: string, error?: Error){
    let storePath = this.jsonPath(taskUuid)
    return readJson(storePath)
      .then((task) => {
        let transition = task.transitions[transitionUuid]
        transition.endingState = stateUuid
        transition.error = error && error.stack || null
        transition.complete = !transition.error
        return writeJson(storePath, task, {spaces: 2})
      })
  }

  getLastTransitionError(taskUuid: string): any {
    return this.getTask(taskUuid)
      .then((result) => {
        let errored = filter({complete: false}, result.transitions)
        return first(errored)
      })
  }


}