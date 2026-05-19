import re
with open('src/components/InfoPanel.tsx', 'r') as f:
    content = f.read()

# We need to find the modal code and remove it from everywhere EXCEPT the first one inside InfoPanel.
# The first occurrence is inside the main InfoPanel component.
# Actually, since it's hard to parse, let's just find the modal code block and remove all occurrences.
# Then insert it exactly at the end of the `InfoPanel` component's return statement.

modal_code_start = "      {isPolicyOpen && ("
modal_code_end = "此为保单重点摘要，理赔时请以 Etiqa 官方条款 (Policy Wordings) 为准。<br/>\n                索赔期限：请在回国后 30 天内提交理赔申请。\n              </div>\n\n            </div>\n          </div>\n        </div>\n      )}"

# Regex to find everything from modal_code_start to modal_code_end
pattern = re.compile(re.escape(modal_code_start) + r'.*?' + re.escape(modal_code_end), re.DOTALL)

# Replace all occurrences with empty string
clean_content = pattern.sub('', content)

# Now, we need to inject it back at the right place.
# The `InfoPanel` component ends with:
#           </section>
#         </div>
#       </div>
#     </div>
#   );
# }
# Wait, let's look at the end of InfoPanel.

injection_point = "        </div>\n      </div>\n    </div>"
if injection_point in clean_content:
    clean_content = clean_content.replace(
        injection_point, 
        modal_code_start + "\n" + 
        content[content.find(modal_code_start)+len(modal_code_start) : content.find(modal_code_end)] + 
        modal_code_end + "\n" + injection_point,
        1 # Only replace the first occurrence
    )

with open('src/components/InfoPanel.tsx', 'w') as f:
    f.write(clean_content)
