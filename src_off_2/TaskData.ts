/**
 * @file TaskController
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

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
  Fresh,
  ResumeError,
  ResumeSuspended
}

export class TaskData {

  name: string
  uuid: string | null
  error: boolean | null
  private statePayload: any

  constructor(taskData: PendingTask) {
    this.name = taskData.metadata.name
    this.uuid = taskData.metadata.uuid || null
    this.error = taskData.metadata.error || null
    this.statePayload = taskData.state
  }

  getUuid(){
    return this.uuid
  }

  getError(){
    return this.error
  }

  getType() : TaskTypes {
    if(this.uuid) {
      if(this.error){
        return TaskTypes.ResumeError
      }
      return TaskTypes.ResumeSuspended
    }

    return TaskTypes.Fresh
  }

}