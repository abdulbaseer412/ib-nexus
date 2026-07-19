import OAuthButton from "./OAuthButton";

/** @deprecated Use OAuthButton with provider="google" instead. */
export default function GoogleButton(props) {
  return <OAuthButton provider="google" {...props} />;
}
