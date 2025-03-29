import nltk
from nltk.corpus import words, stopwords
from nltk.stem import WordNetLemmatizer
import wordfreq

nltk.download('words')
nltk.download('stopwords')
nltk.download('wordnet')

def get_simple_general_words_with_frequency_and_roots(min_frequency=1e-5):
    """Returns a list of simple, general, root words with frequency consideration."""

    english_words = set(words.words('en'))
    english_stopwords = set(stopwords.words('english'))
    lemmatizer = WordNetLemmatizer()

    simple_general_words = []
    for word in english_words:
        word_lower = word.lower()
        if (
            word_lower not in english_stopwords
            and word.isalpha()
            and len(word) > 2
            and len(word) < 10
            and word_lower == word
            and wordfreq.word_frequency(word_lower, 'en') >= min_frequency
        ):
            lemma = lemmatizer.lemmatize(word_lower)
            if lemma == word_lower:  # Only add if it's a root word
                simple_general_words.append(word_lower)

    return simple_general_words

simple_words = get_simple_general_words_with_frequency_and_roots()
print(simple_words[:20])
print(len(simple_words))