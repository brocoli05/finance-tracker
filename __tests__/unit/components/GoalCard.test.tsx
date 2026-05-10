import React from 'react'
import { render, screen } from '@testing-library/react'
import GoalCard, { Goal } from '@/components/GoalCard'
import { calculateGoalProgress, calculateDaysRemaining } from '@/lib/utils/calculations'

const mockHandlers = {
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onAddSavings: jest.fn(),
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: '1',
    title: 'Emergency Fund',
    target_amount: 1000,
    current_amount: 500,
    deadline: '2099-12-31',
    category: 'Other',
    is_achieved: false,
    ...overrides,
  }
}

// ─── Pure-function unit tests ─────────────────────────────────────────────────

describe('calculateGoalProgress', () => {
  it('returns 50 when halfway to target', () => {
    expect(calculateGoalProgress(500, 1000)).toBe(50)
  })

  it('caps at 100 when current exceeds target', () => {
    expect(calculateGoalProgress(1500, 1000)).toBe(100)
  })

  it('returns 0 for a zero target', () => {
    expect(calculateGoalProgress(100, 0)).toBe(0)
  })

  it('returns 100 when current equals target', () => {
    expect(calculateGoalProgress(1000, 1000)).toBe(100)
  })
})

describe('calculateDaysRemaining', () => {
  it('returns a positive number for a future deadline', () => {
    const today = new Date(2024, 0, 1)   // Jan 1 at local midnight
    expect(calculateDaysRemaining('2024-01-11', today)).toBe(10)
  })

  it('returns a negative number for a past deadline', () => {
    const today = new Date(2024, 0, 15)  // Jan 15 at local midnight
    expect(calculateDaysRemaining('2024-01-10', today)).toBe(-5)
  })

  it('returns 0 when deadline is today', () => {
    const today = new Date(2024, 5, 15)  // Jun 15 at local midnight
    expect(calculateDaysRemaining('2024-06-15', today)).toBe(0)
  })
})

// ─── Component tests ──────────────────────────────────────────────────────────

describe('GoalCard', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('progress bar percentage', () => {
    it('displays the correct percentage for a goal in progress', () => {
      render(<GoalCard goal={makeGoal({ current_amount: 250, target_amount: 1000 })} {...mockHandlers} />)
      expect(screen.getByText('25%')).toBeInTheDocument()
    })

    it('displays 100% when current equals target', () => {
      render(<GoalCard goal={makeGoal({ current_amount: 1000, target_amount: 1000 })} {...mockHandlers} />)
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('caps the displayed percentage at 100 when current exceeds target', () => {
      render(<GoalCard goal={makeGoal({ current_amount: 2000, target_amount: 1000 })} {...mockHandlers} />)
      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  describe('congratulations banner', () => {
    it('shows the achievement banner when is_achieved is true', () => {
      render(
        <GoalCard
          goal={makeGoal({ is_achieved: true, current_amount: 1000, target_amount: 1000 })}
          {...mockHandlers}
        />,
      )
      expect(screen.getByText(/goal achieved/i)).toBeInTheDocument()
    })

    it('hides the achievement banner when goal is not yet achieved', () => {
      render(<GoalCard goal={makeGoal()} {...mockHandlers} />)
      expect(screen.queryByText(/goal achieved/i)).not.toBeInTheDocument()
    })

    it('hides the Add Savings button once a goal is achieved', () => {
      render(
        <GoalCard
          goal={makeGoal({ is_achieved: true, current_amount: 1000, target_amount: 1000 })}
          {...mockHandlers}
        />,
      )
      expect(screen.queryByRole('button', { name: /add savings/i })).not.toBeInTheDocument()
    })
  })

  describe('days remaining', () => {
    afterEach(() => jest.useRealTimers())

    it('shows days remaining for a future deadline', () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date(2024, 0, 1))   // Jan 1 at local midnight

      render(
        <GoalCard goal={makeGoal({ deadline: '2024-01-11' })} {...mockHandlers} />,
      )
      expect(screen.getByText('10d left')).toBeInTheDocument()
    })

    it('shows "Due today" when the deadline is today', () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date(2024, 5, 15))  // Jun 15 at local midnight

      render(
        <GoalCard goal={makeGoal({ deadline: '2024-06-15' })} {...mockHandlers} />,
      )
      expect(screen.getByText('Due today')).toBeInTheDocument()
    })

    it('shows overdue message for a past deadline', () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date(2024, 0, 15))  // Jan 15 at local midnight

      render(
        <GoalCard goal={makeGoal({ deadline: '2024-01-10' })} {...mockHandlers} />,
      )
      expect(screen.getByText('5d overdue')).toBeInTheDocument()
    })
  })
})
