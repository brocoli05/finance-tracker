import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TransactionForm from '@/components/TransactionForm'

global.fetch = jest.fn()

describe('TransactionForm', () => {
  const mockOnSuccess = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the form with expense type selected by default', () => {
    render(<TransactionForm onSuccess={mockOnSuccess} />)

    expect(screen.getByRole('button', { name: /expense/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /income/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add transaction/i })).toBeInTheDocument()
  })

  it('shows an error when submitting with an empty amount', async () => {
    const { container } = render(<TransactionForm onSuccess={mockOnSuccess} />)

    // fireEvent.submit bypasses jsdom constraint validation so React's handleSubmit runs
    fireEvent.submit(container.querySelector('form')!)

    await waitFor(() => {
      expect(
        screen.getByText(/amount must be a positive number/i),
      ).toBeInTheDocument()
    })
    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it('shows an error when submitting with no category selected', async () => {
    const { container } = render(<TransactionForm onSuccess={mockOnSuccess} />)

    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '50' } })
    fireEvent.submit(container.querySelector('form')!)

    await waitFor(() => {
      expect(screen.getByText(/please select a category/i)).toBeInTheDocument()
    })
  })

  it('resets the category when toggling between income and expense', async () => {
    const user = userEvent.setup()
    render(<TransactionForm onSuccess={mockOnSuccess} />)

    // Select an expense category
    await user.selectOptions(screen.getByRole('combobox'), 'Food')
    expect(screen.getByRole('combobox')).toHaveValue('Food')

    // Switch to income — category should reset
    await user.click(screen.getByRole('button', { name: /income/i }))
    expect(screen.getByRole('combobox')).toHaveValue('')
  })

  it('shows expense categories by default', () => {
    render(<TransactionForm onSuccess={mockOnSuccess} />)

    expect(screen.getByRole('option', { name: 'Rent' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Food' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Payroll' })).not.toBeInTheDocument()
  })

  it('switches the category dropdown to income options when income type is selected', async () => {
    const user = userEvent.setup()
    render(<TransactionForm onSuccess={mockOnSuccess} />)

    await user.click(screen.getByRole('button', { name: /income/i }))

    expect(screen.getByRole('option', { name: 'Payroll' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Stock Investment' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Rent' })).not.toBeInTheDocument()
  })
})
