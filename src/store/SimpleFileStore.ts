/**
 * @file SimpleFileStore
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

// import Bluebird from 'bluebird'
import {Store, SimpleStore, TaskUpdate, TransitionUpdate} from "./Store"
import {defaultTask, defaultTransition, pruneTaskRetVal, updateObjectProps, reduceObjProps} from "./StoreHelpers"
import {ensureDirSync, readJson, writeJson} from "fs-extra"
import {join} from 'path'
import {v4} from 'uuid'
import {sortBy, filter, first, last, has, each, isFunction, find} from "lodash/fp";

// @ts-ignore
const uncappedeach = each.convert({cap: false})

export class SimpleFileStore implements SimpleStore {

  dirPath: string

  constructor(dirPath: string) {
    this.dirPath = dirPath
    ensureDirSync(this.dirPath)
  }

  private jsonPath(toJoin: string) : string{
    return join(this.dirPath, `${toJoin}.json`)
  }

  createTask(taskName: string) {
    let uuid = v4()
    let t = defaultTask(taskName, uuid)
    return writeJson(this.jsonPath(uuid),t, {spaces: 2})
      .then((res) => {
        return t
      })
  }

  getTask(taskUuid: string, allData?: boolean) {
    let storePath = this.jsonPath(taskUuid)
    return readJson(storePath)
      .then((task) => {
        let retVal = allData ? task : pruneTaskRetVal(task)
        return retVal
      })
  }

  updateTask(taskUuid: string, updateData: TaskUpdate) {
    let storePath = this.jsonPath(taskUuid)
    let update
    return this.getTask(taskUuid, true)
      .then((data) => {
        update = reduceObjProps<TaskUpdate>(data, updateData)
        return writeJson(storePath, update, {spaces: 2})
      })
      .then(() => {
        return update
      })
  }

  createTransition(taskUuid: string, transitionName: string, stateUuid: string, transitionNumber: number) {
    let storePath = this.jsonPath(taskUuid)
    let uuid = v4()
    let tr = defaultTransition(transitionName, uuid, stateUuid, transitionNumber)

    return readJson(storePath)
      .then((data) => {
        data.currentTransition = transitionNumber
        data.transitions[uuid] = tr
        return writeJson(storePath, data, {spaces: 2})
      })
      .then(() => {
        return tr
      })
  }

  getTransition(taskUuid: string, transitionUuid: string) {
    let storePath = this.jsonPath(taskUuid)
    return readJson(storePath)
      .then((data) => {
        return data.transitions[transitionUuid]
      })
  }

  updateTransition(taskUuid: string, transitionUuid: string, updateData: TransitionUpdate) {
    let storePath = this.jsonPath(taskUuid)
    let update
    return readJson(storePath)
      .then((task) => {
        let transition = task.transitions[transitionUuid]
        update = reduceObjProps<TransitionUpdate>(transition, updateData)
        task.transitions[transitionUuid] = update
        return writeJson(storePath, task, {spaces: 2})
      })
      .then(() => {
        return update
      })
  }

  findTransition(taskUuid: string, position: number){
    let storePath = this.jsonPath(taskUuid)
    return readJson(storePath)
      .then((data) => {
        return find({row: position}, data.transitions) || null
      })
  }

  createState(taskUuid: string, state: any) {
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

  getState(taskUuid: string, stateUuid: string) {
    let storePath = this.jsonPath(taskUuid)
    return readJson(storePath)
      .then((data) => {
        return data.states[stateUuid]
      })
  }
}