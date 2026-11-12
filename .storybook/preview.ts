import type { Preview } from "@storybook/react-vite";

/* The package's two documented host prerequisites, supplied the way a consumer must:
   Bootstrap 5.3 utilities (the shell emits d-flex / gap-2 / me-auto and does not
   depend on Bootstrap — without this it renders as a broken vertical stack) and
   simplebar's own stylesheet. Then the package's stylesheet LAST, as in a host. */
import "bootstrap/dist/css/bootstrap.min.css";
import "simplebar-react/dist/simplebar.min.css";
import "../styles.css";

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    controls: { expanded: true },
  },
};

export default preview;
