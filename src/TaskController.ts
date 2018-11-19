/**
 * @file TaskController
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */
import {cloneDeep, isEqual} from 'lodash/fp'

interface TaskMetadata {
  name: string
  uuid?: string | null
  error?: boolean | null
}

interface TaskState {
  [key: string]: any
}

export interface PendingTask {
  metadata: TaskMetadata,
  state: TaskState
}

export enum TaskTypes {
  Fresh = 'Fresh',
  ResumeError = 'ResumeError',
  ResumeSuspended = 'ResumeSuspended'
}

/**
 * TODO - Use a hash table to find duplicate state objects. https://github.com/puleos/object-hash/issues/53
 * @author - Jim Bulkowski
 * @date - 10/28/18
 * @time - 12:29 AM
 */



export class TaskController {

  name: string
  uuid: string | null
  error: boolean | null
  private inProgress: boolean
  private originalStatePayload: any
  private currentState: any
  private currentTransition: number
  private transitionName: string
  private type: TaskTypes

  constructor(taskData: PendingTask) {
    this.name = taskData.metadata.name
    this.uuid = taskData.metadata.uuid || null
    this.error = taskData.metadata.error || null
    this.originalStatePayload = taskData.state || {}
    this.type = this.getType()
    this.inProgress = !!this.uuid

  }

  setTransitionName(name: string): string{
    this.transitionName = name
    return this.transitionName
  }
  getTransitionName(): string {
    return this.transitionName
  }

  setCurrentTransition(n: number): number {
    this.currentTransition = n
    return this.currentTransition
  }
  incrementCurrentTransition(): number {
    this.currentTransition += 1
    return this.currentTransition
  }
  getCurrentTransition(): number {
    return this.currentTransition
  }


  getUuid(){
    return this.uuid
  }
  setUuid(uuid: string){
    if(this.inProgress){
      throw new Error('UUID has already been set. This should never be seen.')
    }
    this.inProgress = true
    this.uuid = uuid
  }
  getState() : any{
    return cloneDeep(this.currentState)
  }

  setState(state: any){
    this.currentState = state
  }

  getName(){
    return this.name
  }

  getError(){
    return this.error
  }

  getPayload(){
    return cloneDeep(this.originalStatePayload)
  }

  getType() : TaskTypes {
    if(this.type){
      return this.type
    }
    if(this.uuid) {
      if(this.error){
        return TaskTypes.ResumeError
      }
      return TaskTypes.ResumeSuspended
    }

    return TaskTypes.Fresh
  }

}