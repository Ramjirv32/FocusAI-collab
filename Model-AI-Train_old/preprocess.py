import pandas as pd
from sklearn.preprocessing import LabelEncoder
import joblib

# Load the dataset
df = pd.read_('FocusaiModelTraining.')

# Initialize label encoders for each categorical feature
app_name_encoder = LabelEncoder()
tab_name_encoder = LabelEncoder()
label_encoder = LabelEncoder()

# Fit and transform the categorical columns
df['AppNameEncoded'] = app_name_encoder.fit_transform(df['App_Name'])
df['TabNameEncoded'] = tab_name_encoder.fit_transform(df['Tab_Name'])
df['LabelEncoded'] = label_encoder.fit_transform(df['Label'])

# Save the encoders for future use
joblib.dump(app_name_encoder, 'app_name_encoder.pkl')
joblib.dump(tab_name_encoder, 'tab_name_encoder.pkl')
joblib.dump(label_encoder, 'label_encoder.pkl')


df.to_('processed_data.', index=False)

print("Data preprocessing complete. Processed data saved to processed_data.")
print("Encoders saved as .pkl files")