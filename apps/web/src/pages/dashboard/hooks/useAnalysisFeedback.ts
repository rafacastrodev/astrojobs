import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { analysisServices } from '@/services/analysisServices'
import { getApiErrorMessage } from '@/utils'

import type { AnalysisResult, FeedbackRating } from '../types'

export const useAnalysisFeedback = (analysis: AnalysisResult) => {
  const queryClient = useQueryClient()
  const [isCorrecting, setIsCorrecting] = useState(false)
  const [expectedScore, setExpectedScore] = useState(
    analysis.feedback?.expected_score?.toString() ?? '',
  )
  const [comment, setComment] = useState(analysis.feedback?.comment ?? '')

  const submit = useMutation({
    mutationFn: (rating: FeedbackRating) =>
      analysisServices.submitFeedback(analysis.id, {
        rating,
        expected_score: expectedScore === '' ? undefined : Number(expectedScore),
        comment: comment.trim() === '' ? undefined : comment.trim(),
      }),
    onSuccess: () => {
      setIsCorrecting(false)
      return queryClient.invalidateQueries({
        queryKey: ['resume-analyses', analysis.resume_document_id],
      }).then(() =>
        queryClient.invalidateQueries({ queryKey: ['resumes'] }),
      )
    },
  })

  const agree = () => {
    setIsCorrecting(false)
    setExpectedScore('')
    setComment('')
    submit.mutate('up')
  }

  const parsedScore = Number(expectedScore)
  const scoreIsValid =
    expectedScore === '' ||
    (Number.isInteger(parsedScore) && parsedScore >= 0 && parsedScore <= 100)

  return {
    rating: analysis.feedback?.rating ?? null,
    isCorrecting,
    startCorrecting: () => setIsCorrecting(true),
    cancelCorrecting: () => setIsCorrecting(false),
    expectedScore,
    setExpectedScore,
    comment,
    setComment,
    scoreIsValid,
    agree,
    disagree: () => submit.mutate('down'),
    isSubmitting: submit.isPending,
    error: submit.isError ? getApiErrorMessage(submit.error) : null,
  }
}
