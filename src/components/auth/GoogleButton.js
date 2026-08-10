import OAuthButton from "./OAuthButton";

export default function GoogleButton({ intent = "signin", signupEmail = "", flowSource, ...props }) {
  return (
    <OAuthButton
      provider="google"
      intent={intent}
      signupEmail={signupEmail}
      flowSource={flowSource}
      {...props}
    />
  );
}
