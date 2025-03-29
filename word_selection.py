import nltk
from nltk.corpus import words

def get_common_nouns(num_nouns=1000):
    """
    Generates a list of common English nouns using NLTK.

    Args:
        num_nouns (int): The approximate number of nouns to retrieve.

    Returns:
        list: A list of common English nouns, or None if NLTK resources are unavailable.
    """
    try:
        nltk.data.find('corpora/words')
        nltk.data.find('taggers/averaged_perceptron_tagger')

    except LookupError:
        print("NLTK data not found. Downloading...")
        nltk.download('words')
        nltk.download('averaged_perceptron_tagger')
        nltk.download('universal_tagset')

    try:
        word_list = words.words()
        tagged_words = nltk.pos_tag(word_list, tagset='universal')
        nouns = [word.lower() for word, pos in tagged_words if pos == 'NOUN']

        # Simple frequency-based filtering (can be improved)
        from collections import Counter
        word_counts = Counter(nouns)
        common_nouns = [word for word, count in word_counts.most_common(num_nouns)]

        return common_nouns

    except Exception as e:
        print(f"An error occurred: {e}")
        return None

# Example usage:
common_nouns_list = get_common_nouns(200)

if common_nouns_list:
    print(common_nouns_list) # Print the first 20 nouns