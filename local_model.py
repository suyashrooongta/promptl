# import ollama

# def get_llm_response(prompts, model: str = "default-model"):
#     """
#     Get responses from an LLM model using ollama.

#     Args:
#         prompts (str | list): A single prompt or a list of prompts for the model.
#         model (str): The name of the model to use. Defaults to "default-model".

#     Returns:
#         list: A list of responses from the model.
#     """
#     if isinstance(prompts, str):
#         prompts = [prompts]  # Convert single prompt to a list

#     responses = []
#     for prompt in prompts:
#         response = ollama.chat(model=model, messages=[{'role': 'user', 'content': prompt}])
#         responses.append(response)

#     return responses

# # Example usage
# if __name__ == "__main__":
#     # Use a smaller model for faster responses
#     model_name = "llama3.2:1b"  # Replace with a smaller model name if available

#     # Single prompt
#     prompt = "Describe satellite in 150 words."
#     print(get_llm_response(prompt, model_name))


from transformers import pipeline

messages = [
    {"role": "user", "content": "Describe moon in 100 words."},
]
pipe = pipeline("text-generation", model="google/gemma-3-1b-it")
print(pipe(messages))