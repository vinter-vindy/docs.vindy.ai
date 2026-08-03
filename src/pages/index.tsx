import Layout from "@theme/Layout";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Hero from "@site/src/components/Hero";
import Features from "@site/src/components/Features";

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`Welcome to ${siteConfig.title}`}
      description="Vindy API documentation — programmatic access to your assistants, calls, and recordings"
    >
      <main className="homepage">
        <Hero />
        <Features />
      </main>
    </Layout>
  );
}
