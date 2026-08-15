type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = ({ ...props }: InputProps) => {
  return <input {...props} />
}
