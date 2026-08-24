declare global {
  interface Liveblocks {
    ActivitiesData: {
      $newApplication: {
        applicationId: number
        jobId: number
        jobTitle: string
        applicantName: string
      }
      $jobOffer: {
        offerId: number
        jobId: number
        jobTitle: string
        recruiterName: string
        message: string
      }
      $jobClosed: {
        jobId: number
        jobTitle: string
      }
      $applicationStatusChanged: {
        applicationId: number
        jobId: number
        jobTitle: string
        recruiterName: string
        status: 'submitted' | 'reviewing' | 'accepted' | 'rejected' | 'removed'
      }
    }
  }
}

export {}
