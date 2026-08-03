import { Phone, Book, ShieldCheck } from "lucide-react";
import Translate from "@docusaurus/Translate";

const FeatureList = [
  {
    title: (
      <Translate id="homepage.features.calls.title" description="Feature title: call data">
        Your Call Data
      </Translate>
    ),
    description: (
      <Translate id="homepage.features.calls.description" description="Feature description: call data">
        Retrieve calls, transcripts, structured data, and recordings over a simple REST API
      </Translate>
    ),
    icon: <Phone className="feature-icon" />,
  },
  {
    title: (
      <Translate id="homepage.features.docs.title" description="Feature title: docs">
        Code-First Docs
      </Translate>
    ),
    description: (
      <Translate id="homepage.features.docs.description" description="Feature description: docs">
        Every endpoint documented with curl, Node.js, and Python examples
      </Translate>
    ),
    icon: <Book className="feature-icon" />,
  },
  {
    title: (
      <Translate id="homepage.features.security.title" description="Feature title: security">
        Secure by Design
      </Translate>
    ),
    description: (
      <Translate id="homepage.features.security.description" description="Feature description: security">
        API keys scoped to your company — your data stays yours
      </Translate>
    ),
    icon: <ShieldCheck className="feature-icon" />,
  },
];

function Feature({
  title,
  description,
  icon,
}: {
  title: JSX.Element;
  description: JSX.Element;
  icon: JSX.Element;
}): JSX.Element {
  return (
    <div className="col col--4">
      <div className="text--center">{icon}</div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function Features(): JSX.Element {
  return (
    <section className="features">
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
