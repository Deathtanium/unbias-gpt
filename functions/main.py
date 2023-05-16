# Welcome to Cloud Functions for Firebase for Python!
# To get started, simply uncomment the below code or create your own.
# Deploy with `firebase deploy`

from firebase_functions import https_fn
from firebase_admin import initialize_app, firestore
import tiktoken
import openai


app = initialize_app()

#authenticated function that uses tiktoken to count tokens in a given text
@https_fn.on_call(region="europe-west1",max_instances=8)
def count_tokens(req: https_fn.CallableRequest) -> https_fn.Response:
  if req.auth.uid is None:
    return https_fn.Response("Not authenticated", status=401)
  #initialize the tiktoken encoder for Ada
  enc = tiktoken.get_encoding("cl100k_base")
  text = req.data["text"] + " ->"
  if text is None:
    return https_fn.Response("No text provided", status=400)
  return str(len(enc.encode(text))-1)


#authenticated function that sends a text to the Ada model and returns the result
@https_fn.on_call(region="europe-west1",max_instances=8)
def eval_text(req: https_fn.CallableRequest) -> https_fn.Response:
  if req.auth.uid is None:
    return https_fn.Response("Not authenticated", status=401)
  prompt = req.data["text"] + " ->"
  enc = tiktoken.get_encoding("cl100k_base")
  tokCount = len(enc.encode(prompt))
  if tokCount > 2048:
    return https_fn.Response("Text too long", status=400)
  db = firestore.client()
  doc_ref = db.collection(u'userbalance').document(req.auth.token.get('email', ''))
  doc = doc_ref.get()
  if doc.to_dict()["balance"] < tokCount:
    return https_fn.Response("Insufficient tokens", status=400)
  if prompt is None:
    return https_fn.Response("No text provided", status=400)
  
  doc_ref.update({
    u'balance': firestore.Increment(-tokCount)
  })
  response = openai.Completion.create(
    engine="ada:ft-personal-2022-12-25-15-32-22",
    prompt=prompt,
    temperature=0.1,
    max_tokens=1,
    top_p=1,
    frequency_penalty=0,
    presence_penalty=0.6,
    stop=["->"]
  )
  res_text = response["choices"][0]["text"]
  return res_text

@https_fn.on_call(region="europe-west1",max_instances=8)
def get_balance(req: https_fn.CallableRequest) -> https_fn.Response:
  if req.auth.uid is None:
    return https_fn.Response("Not authenticated", status=401)
  db = firestore.client()
  doc_ref = db.collection(u'userbalance').document(req.auth.token.get('email', ''))
  doc = doc_ref.get()
  if doc.exists:
    return str(doc.to_dict()["balance"])
  else:
    #create it with 0 balance
    doc_ref.set({
      u'balance': 0
    })
    return "0"
  
@https_fn.on_call(region="europe-west1",max_instances=8)
def debug_add_tokens(req: https_fn.CallableRequest) -> https_fn.Response:
  if req.auth.uid is None:
    return https_fn.Response("Not authenticated", status=401)
  db = firestore.client()
  doc_ref = db.collection(u'userbalance').document(req.auth.token.get('email', ''))
  doc = doc_ref.get()
  doc_ref.update({
      u'balance': firestore.Increment(req.data['tokens'])
    })
  return req.data['tokens']