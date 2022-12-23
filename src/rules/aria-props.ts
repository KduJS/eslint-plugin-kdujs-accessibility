import type { Rule } from "eslint";

import { aria } from "aria-query";
import {
  defineTemplateBodyVisitor,
  getAttributeName,
  makeDocsURL
} from "../utils";

const rule: Rule.RuleModule = {
  meta: {
    docs: {
      url: makeDocsURL("aria-props")
    },
    messages: {
      default: "{{name}} This attribute is an invalid ARIA attribute."
    }
  },
  create(context) {
    return defineTemplateBodyVisitor(context, {
      KAttribute(node) {
        const name = getAttributeName(node);
        const lowered = name && name.toLowerCase();

        if (
          lowered &&
          lowered.startsWith("aria-") &&
          !aria.has(lowered as any)
        ) {
          context.report({
            node: node as any,
            messageId: "default",
            data: { name: name as string }
          });
        }
      }
    });
  }
};

export default rule;
