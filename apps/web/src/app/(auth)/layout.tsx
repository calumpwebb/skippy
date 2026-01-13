export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return <div className="flex min-h-screen items-center justify-center">{children}</div>;
}
